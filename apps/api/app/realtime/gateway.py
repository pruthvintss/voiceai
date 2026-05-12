from __future__ import annotations

import asyncio
import base64
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

import structlog
from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import AsyncSessionFactory
from app.core.security import get_subject_from_token
from app.models.conversation import Conversation, Transcript
from app.models.user import User
from app.models.workspace import WorkspaceMember
from app.realtime import protocol as proto
from app.realtime.audio_pipeline import decode_base64_audio, encode_audio_base64
from app.realtime.base_provider import BaseVoiceProvider
from app.realtime.gemini_provider import GeminiLiveProvider
from app.realtime.openai_provider import OpenAIRealtimeProvider
from app.realtime.session_manager import create_session, end_session, update_session_status
from app.services.byok_service import get_active_api_key
from app.services.context_service import build_context
from app.services.mcp_service import MCPOrchestrator

logger = structlog.get_logger(__name__)


class VoiceSession:
    """
    Manages a single realtime voice session between one WebSocket client
    and one AI provider backend.
    """

    def __init__(self, websocket: WebSocket):
        self.ws = websocket
        self.session_id: Optional[str] = None
        self.conversation_id: Optional[uuid.UUID] = None
        self.user_id: Optional[uuid.UUID] = None
        self.workspace_id: Optional[uuid.UUID] = None
        self.provider_name: str = ""
        self.provider: Optional[BaseVoiceProvider] = None
        self.transcript_turns: list[dict[str, Any]] = []
        self.latency_samples: list[float] = []
        self._response_start_time: Optional[float] = None
        self._audio_seq: int = 0
        self._mcp: Optional[MCPOrchestrator] = None
        self._pending_tool_calls: dict[str, asyncio.Event] = {}
        self._tool_results: dict[str, Any] = {}

    async def send(self, payload: dict[str, Any]) -> None:
        try:
            await self.ws.send_json(payload)
        except Exception as exc:
            logger.warning("Failed to send WebSocket message", error=str(exc))

    # ------------------------------------------------------------------
    # Provider callbacks
    # ------------------------------------------------------------------

    async def on_transcript(self, text: str, role: str, is_final: bool) -> None:
        if is_final:
            turn_id = str(uuid.uuid4())
            self.transcript_turns.append({
                "role": role,
                "content": text,
                "timestamp": datetime.now(tz=timezone.utc).isoformat(),
                "is_interrupted": False,
                "turn_id": turn_id,
            })
            await self.send(proto.make_transcript_final(text, role, turn_id))
        else:
            await self.send(proto.make_transcript_partial(text, role))

    async def on_audio(self, audio_bytes: bytes, sequence: int) -> None:
        if self._response_start_time is not None:
            import time
            latency = (time.monotonic() - self._response_start_time) * 1000
            self.latency_samples.append(latency)
            self._response_start_time = None

        await self.send(proto.make_audio_response(encode_audio_base64(audio_bytes), sequence))

    async def on_tool_call(self, call_id: str, tool_name: str, args: dict[str, Any]) -> None:
        if self._mcp is None or self.conversation_id is None:
            await self.send(proto.make_error("tool_error", "MCP not configured"))
            return

        # Notify client about the tool call
        await self.send(proto.make_tool_call(call_id, tool_name, args, requires_approval=False))

        # Execute the tool
        async with AsyncSessionFactory() as db:
            result = await self._mcp.execute_tool(
                tool_name=tool_name,
                args=args,
                conversation_id=self.conversation_id,
                tool_call_id=call_id,
            )

        # Return result to provider
        if self.provider:
            tool_result = result.result or {"error": result.error}
            await self.provider.send_tool_result(call_id, tool_result)

    async def on_done(self) -> None:
        await self.send(proto.make_agent_thinking())

    async def on_error(self, code: str, message: str) -> None:
        logger.error("Provider error", code=code, message=message)
        await self.send(proto.make_error(code, message))


async def handle_websocket_session(websocket: WebSocket) -> None:
    """
    Main entry point for a WebSocket connection.
    Handles the full lifecycle of a voice session.
    """
    await websocket.accept()
    session = VoiceSession(websocket)
    start_time: Optional[float] = None

    try:
        # -----------------------------------------------------------------------
        # Phase 1: Authenticate
        # -----------------------------------------------------------------------
        auth_data = await asyncio.wait_for(websocket.receive_json(), timeout=10.0)
        token = auth_data.get("token") or websocket.query_params.get("token")

        if not token:
            await websocket.send_json(proto.make_error("auth_required", "Token required"))
            await websocket.close(code=4001)
            return

        try:
            user_id_str = get_subject_from_token(token, "access")
            session.user_id = uuid.UUID(user_id_str)
        except Exception:
            await websocket.send_json(proto.make_error("auth_failed", "Invalid token"))
            await websocket.close(code=4001)
            return

        # -----------------------------------------------------------------------
        # Phase 2: Wait for session.start
        # -----------------------------------------------------------------------
        start_msg = auth_data if auth_data.get("type") == "session.start" else await asyncio.wait_for(
            websocket.receive_json(), timeout=15.0
        )

        if start_msg.get("type") != "session.start":
            await websocket.send_json(proto.make_error("protocol_error", "Expected session.start"))
            await websocket.close(code=4002)
            return

        provider_name = start_msg.get("provider", "openai")
        model = start_msg.get("model", "gpt-4o-realtime-preview")
        workspace_id_str = start_msg.get("workspace_id")
        api_key_id_str = start_msg.get("api_key_id")
        custom_system_prompt = start_msg.get("system_prompt", "")
        voice = start_msg.get("voice")

        if not workspace_id_str:
            await websocket.send_json(proto.make_error("missing_field", "workspace_id required"))
            await websocket.close(code=4002)
            return

        try:
            session.workspace_id = uuid.UUID(workspace_id_str)
            api_key_id = uuid.UUID(api_key_id_str) if api_key_id_str else None
        except ValueError:
            await websocket.send_json(proto.make_error("invalid_field", "Invalid UUID"))
            await websocket.close(code=4002)
            return

        session.provider_name = provider_name

        async with AsyncSessionFactory() as db:
            # Verify workspace membership
            member_result = await db.execute(
                select(WorkspaceMember).where(
                    WorkspaceMember.workspace_id == session.workspace_id,
                    WorkspaceMember.user_id == session.user_id,
                )
            )
            if member_result.scalar_one_or_none() is None:
                await websocket.send_json(proto.make_error("forbidden", "Not a workspace member"))
                await websocket.close(code=4003)
                return

            # Resolve API key
            api_key = await get_active_api_key(
                db=db,
                workspace_id=session.workspace_id,
                provider=provider_name,
                api_key_id=api_key_id,
            )
            if not api_key:
                await websocket.send_json(
                    proto.make_error("no_api_key", f"No API key for provider: {provider_name}")
                )
                await websocket.close(code=4004)
                return

            # Build pre-call context
            context = await build_context(
                db=db,
                user_id=session.user_id,
                workspace_id=session.workspace_id,
            )

            # Create conversation record
            conversation = Conversation(
                workspace_id=session.workspace_id,
                user_id=session.user_id,
                provider=provider_name,
                model=model,
                status="active",
            )
            db.add(conversation)
            await db.flush()
            await db.refresh(conversation)
            session.conversation_id = conversation.id

            # Create empty transcript record
            transcript = Transcript(
                conversation_id=conversation.id,
                turns=[],
            )
            db.add(transcript)
            await db.flush()

            await db.commit()

            # Load MCP tools
            mcp = MCPOrchestrator(db=db, workspace_id=session.workspace_id)
            tools = await mcp.discover_tools()
            session._mcp = mcp

        # -----------------------------------------------------------------------
        # Phase 3: Connect to AI provider
        # -----------------------------------------------------------------------
        provider = _create_provider(provider_name)
        session.provider = provider

        # Wire up callbacks
        provider.on_transcript = session.on_transcript
        provider.on_audio = session.on_audio
        provider.on_tool_call = session.on_tool_call
        provider.on_done = session.on_done
        provider.on_error = session.on_error

        system_prompt = _build_system_prompt(context, custom_system_prompt)

        try:
            await provider.connect(
                api_key=api_key,
                model=model,
                system_prompt=system_prompt,
                voice=voice,
                tools=tools if tools else None,
            )
        except Exception as exc:
            logger.error("Provider connection failed", provider=provider_name, error=str(exc))
            await websocket.send_json(
                proto.make_error("provider_connect_failed", f"Could not connect: {exc}")
            )
            await websocket.close(code=4005)
            return

        # Register session in Redis
        active_session = await create_session(
            user_id=session.user_id,
            workspace_id=session.workspace_id,
            conversation_id=session.conversation_id,
            provider=provider_name,
            model=model,
        )
        session.session_id = active_session.session_id

        await websocket.send_json(
            proto.make_session_ready(
                session_id=session.session_id,
                conversation_id=str(session.conversation_id),
                context_injected=bool(context.total_tokens > 0),
            )
        )

        import time
        start_time = time.monotonic()

        # -----------------------------------------------------------------------
        # Phase 4: Main message loop
        # -----------------------------------------------------------------------
        while True:
            try:
                raw = await asyncio.wait_for(websocket.receive_json(), timeout=120.0)
            except asyncio.TimeoutError:
                # Keep-alive ping
                await websocket.send_json({"type": "ping"})
                continue

            msg_type = raw.get("type", "")

            if msg_type == "audio.chunk":
                audio_b64 = raw.get("data", "")
                if audio_b64 and provider:
                    audio_bytes = decode_base64_audio(audio_b64)
                    import time as _time
                    session._response_start_time = _time.monotonic()
                    await provider.send_audio(audio_bytes)

            elif msg_type == "audio.end":
                if provider:
                    await provider.commit_audio()

            elif msg_type == "interrupt":
                if provider:
                    await provider.interrupt()
                    # Mark the last turn as interrupted
                    if session.transcript_turns:
                        session.transcript_turns[-1]["is_interrupted"] = True

            elif msg_type == "tool.response":
                tool_call_id = raw.get("tool_call_id", "")
                result = raw.get("result", {})
                if provider and tool_call_id:
                    await provider.send_tool_result(tool_call_id, result)

            elif msg_type == "session.end":
                break

            else:
                logger.debug("Unknown message type", type=msg_type)

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected", session_id=session.session_id)
    except asyncio.TimeoutError:
        await websocket.send_json(proto.make_error("timeout", "Session timed out"))
    except Exception as exc:
        logger.error("Session error", error=str(exc), exc_info=True)
        try:
            await websocket.send_json(proto.make_error("internal_error", str(exc)))
        except Exception:
            pass
    finally:
        # -----------------------------------------------------------------------
        # Phase 5: Cleanup and post-processing
        # -----------------------------------------------------------------------
        import time as _time

        duration = _time.monotonic() - start_time if start_time else 0.0

        if session.provider:
            try:
                await session.provider.disconnect()
            except Exception:
                pass

        if session.session_id:
            await end_session(session.session_id)

        if session.conversation_id:
            try:
                await websocket.send_json(
                    proto.make_session_ended(
                        str(session.conversation_id), duration_seconds=duration
                    )
                )
            except Exception:
                pass

            # Trigger post-call background processing
            await _trigger_post_call_processing(
                conversation_id=session.conversation_id,
                user_id=session.user_id,
                workspace_id=session.workspace_id,
                transcript_turns=session.transcript_turns,
                latency_samples=session.latency_samples,
                duration_seconds=duration,
            )


def _create_provider(provider_name: str) -> BaseVoiceProvider:
    if provider_name == "openai":
        return OpenAIRealtimeProvider()
    elif provider_name == "gemini":
        return GeminiLiveProvider()
    else:
        raise ValueError(f"Unknown provider: {provider_name}")


def _build_system_prompt(context, custom_prompt: str) -> str:
    context_block = context.to_system_prompt_block()
    parts = []
    if custom_prompt:
        parts.append(custom_prompt)
    if context_block:
        parts.append(f"--- User Context ---\n{context_block}")
    if not parts:
        parts.append(
            "You are a helpful, friendly voice AI assistant. "
            "Be concise, clear, and responsive. "
            "Speak naturally as if in a conversation."
        )
    return "\n\n".join(parts)


async def _trigger_post_call_processing(
    conversation_id: uuid.UUID,
    user_id: Optional[uuid.UUID],
    workspace_id: Optional[uuid.UUID],
    transcript_turns: list[dict[str, Any]],
    latency_samples: list[float],
    duration_seconds: float,
) -> None:
    """Queue the post-call worker task."""
    try:
        from app.workers.post_call_worker import process_post_call
        process_post_call.delay(
            conversation_id=str(conversation_id),
            user_id=str(user_id) if user_id else None,
            workspace_id=str(workspace_id) if workspace_id else None,
            transcript_turns=transcript_turns,
            latency_samples=latency_samples,
            duration_seconds=duration_seconds,
        )
        logger.info("Post-call processing queued", conversation_id=str(conversation_id))
    except Exception as exc:
        logger.error("Failed to queue post-call processing", error=str(exc))
        # Fall back to synchronous processing
        try:
            async with AsyncSessionFactory() as db:
                from app.workers.post_call_worker import _run_post_call_sync
                await _run_post_call_sync(
                    db=db,
                    conversation_id=conversation_id,
                    user_id=user_id,
                    workspace_id=workspace_id,
                    transcript_turns=transcript_turns,
                    latency_samples=latency_samples,
                    duration_seconds=duration_seconds,
                )
        except Exception as fallback_exc:
            logger.error("Post-call fallback also failed", error=str(fallback_exc))
