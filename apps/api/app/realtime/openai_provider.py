from __future__ import annotations

import asyncio
import base64
import json
import uuid
from typing import Any, Optional

import structlog
import websockets
from websockets.exceptions import ConnectionClosed

from app.realtime.base_provider import BaseVoiceProvider

logger = structlog.get_logger(__name__)

OPENAI_REALTIME_URL = "wss://api.openai.com/v1/realtime"


class OpenAIRealtimeProvider(BaseVoiceProvider):
    """
    Integration with OpenAI Realtime API (WebSocket).
    Handles bidirectional audio streaming, transcription, and function calling.
    """

    def __init__(self):
        super().__init__()
        self._ws: Optional[websockets.WebSocketClientProtocol] = None
        self._connected: bool = False
        self._listen_task: Optional[asyncio.Task] = None
        self._model: str = ""

    @property
    def is_connected(self) -> bool:
        return self._connected and self._ws is not None

    async def connect(
        self,
        api_key: str,
        model: str,
        system_prompt: str,
        voice: Optional[str] = "alloy",
        tools: Optional[list[dict[str, Any]]] = None,
    ) -> None:
        self._model = model
        url = f"{OPENAI_REALTIME_URL}?model={model}"

        headers = {
            "Authorization": f"Bearer {api_key}",
            "OpenAI-Beta": "realtime=v1",
        }

        try:
            self._ws = await websockets.connect(url, additional_headers=headers)
            self._connected = True
            logger.info("OpenAI Realtime connected", model=model)
        except Exception as exc:
            logger.error("OpenAI Realtime connection failed", error=str(exc))
            raise

        # Send session configuration
        session_config: dict[str, Any] = {
            "type": "session.update",
            "session": {
                "modalities": ["text", "audio"],
                "instructions": system_prompt,
                "voice": voice or "alloy",
                "input_audio_format": "pcm16",
                "output_audio_format": "pcm16",
                "input_audio_transcription": {"model": "whisper-1"},
                "turn_detection": {
                    "type": "server_vad",
                    "threshold": 0.5,
                    "prefix_padding_ms": 300,
                    "silence_duration_ms": 500,
                },
                "temperature": 0.8,
                "max_response_output_tokens": 4096,
            },
        }

        if tools:
            session_config["session"]["tools"] = tools
            session_config["session"]["tool_choice"] = "auto"

        await self._send(session_config)

        # Start background listener
        self._listen_task = asyncio.create_task(self._listen_loop())

    async def send_audio(self, audio_chunk: bytes) -> None:
        if not self.is_connected:
            raise RuntimeError("Provider not connected")
        encoded = base64.b64encode(audio_chunk).decode()
        await self._send({"type": "input_audio_buffer.append", "audio": encoded})

    async def commit_audio(self) -> None:
        """Commit the audio buffer to trigger VAD-based response generation."""
        if not self.is_connected:
            return
        await self._send({"type": "input_audio_buffer.commit"})
        await self._send({"type": "response.create"})

    async def interrupt(self) -> None:
        """Cancel the current server response."""
        if not self.is_connected:
            return
        await self._send({"type": "response.cancel"})
        logger.debug("OpenAI response cancelled")

    async def send_tool_result(self, tool_call_id: str, result: dict[str, Any]) -> None:
        await self._send({
            "type": "conversation.item.create",
            "item": {
                "type": "function_call_output",
                "call_id": tool_call_id,
                "output": json.dumps(result),
            },
        })
        await self._send({"type": "response.create"})

    async def disconnect(self) -> None:
        self._connected = False
        if self._listen_task and not self._listen_task.done():
            self._listen_task.cancel()
            try:
                await self._listen_task
            except asyncio.CancelledError:
                pass
        if self._ws:
            await self._ws.close()
            self._ws = None
        logger.info("OpenAI Realtime disconnected")

    async def _send(self, payload: dict[str, Any]) -> None:
        if self._ws is None:
            raise RuntimeError("WebSocket not connected")
        await self._ws.send(json.dumps(payload))

    async def _listen_loop(self) -> None:
        """Background task: receive and dispatch events from OpenAI."""
        if self._ws is None:
            return

        try:
            async for raw_message in self._ws:
                if not self._connected:
                    break
                try:
                    event = json.loads(raw_message)
                    await self._handle_event(event)
                except json.JSONDecodeError:
                    logger.warning("Failed to parse OpenAI event", raw=str(raw_message)[:200])
        except ConnectionClosed as exc:
            logger.info("OpenAI WebSocket closed", code=exc.code, reason=exc.reason)
            self._connected = False
            if self.on_done:
                await self.on_done()
        except asyncio.CancelledError:
            pass
        except Exception as exc:
            logger.error("OpenAI listener error", error=str(exc))
            self._connected = False
            if self.on_error:
                await self.on_error("provider_error", str(exc))

    async def _handle_event(self, event: dict[str, Any]) -> None:
        event_type = event.get("type", "")

        if event_type == "error":
            error_detail = event.get("error", {})
            code = error_detail.get("code", "unknown")
            message = error_detail.get("message", "Unknown error")
            logger.error("OpenAI Realtime error", code=code, message=message)
            if self.on_error:
                await self.on_error(code, message)

        elif event_type == "conversation.item.input_audio_transcription.completed":
            transcript = event.get("transcript", "")
            if transcript and self.on_transcript:
                await self.on_transcript(transcript, "user", True)

        elif event_type == "response.audio_transcript.delta":
            delta = event.get("delta", "")
            if delta and self.on_transcript:
                await self.on_transcript(delta, "assistant", False)

        elif event_type == "response.audio_transcript.done":
            transcript = event.get("transcript", "")
            if transcript and self.on_transcript:
                await self.on_transcript(transcript, "assistant", True)

        elif event_type == "response.audio.delta":
            audio_b64 = event.get("delta", "")
            if audio_b64:
                audio_bytes = base64.b64decode(audio_b64)
                if self.on_audio:
                    await self.on_audio(audio_bytes, self._next_sequence())

        elif event_type == "response.function_call_arguments.done":
            call_id = event.get("call_id", str(uuid.uuid4()))
            tool_name = event.get("name", "")
            raw_args = event.get("arguments", "{}")
            try:
                args = json.loads(raw_args)
            except json.JSONDecodeError:
                args = {"raw": raw_args}
            if self.on_tool_call:
                await self.on_tool_call(call_id, tool_name, args)

        elif event_type == "response.done":
            status = event.get("response", {}).get("status", "completed")
            if status == "completed" and self.on_done:
                await self.on_done()

        elif event_type in ("session.created", "session.updated"):
            logger.debug("OpenAI session event", type=event_type)

        else:
            logger.debug("Unhandled OpenAI event", type=event_type)
