from __future__ import annotations

import asyncio
import base64
import json
import uuid
from typing import Any, Optional

import structlog

from app.realtime.base_provider import BaseVoiceProvider

logger = structlog.get_logger(__name__)


class GeminiLiveProvider(BaseVoiceProvider):
    """
    Integration with Google Gemini Live API.
    Uses google.generativeai Live streaming interface.
    """

    def __init__(self):
        super().__init__()
        self._session = None
        self._client = None
        self._connected: bool = False
        self._listen_task: Optional[asyncio.Task] = None
        self._model: str = ""
        self._input_queue: asyncio.Queue = asyncio.Queue()

    @property
    def is_connected(self) -> bool:
        return self._connected

    async def connect(
        self,
        api_key: str,
        model: str,
        system_prompt: str,
        voice: Optional[str] = None,
        tools: Optional[list[dict[str, Any]]] = None,
    ) -> None:
        import google.generativeai as genai
        from google.generativeai.types import content_types

        self._model = model
        genai.configure(api_key=api_key)

        generation_config = {
            "response_modalities": ["AUDIO", "TEXT"],
            "speech_config": {
                "voice_config": {
                    "prebuilt_voice_config": {"voice_name": voice or "Charon"}
                }
            },
        }

        self._client = genai.GenerativeModel(
            model_name=model,
            system_instruction=system_prompt,
            generation_config=generation_config,
        )

        # Start the live session
        self._session = await self._client.start_chat(enable_automatic_function_calling=False)
        self._connected = True
        logger.info("Gemini Live connected", model=model)

        self._listen_task = asyncio.create_task(self._listen_loop())

    async def send_audio(self, audio_chunk: bytes) -> None:
        if not self.is_connected or self._session is None:
            raise RuntimeError("Provider not connected")
        await self._input_queue.put(audio_chunk)

    async def commit_audio(self) -> None:
        """Signal end of audio input (Gemini handles VAD natively)."""
        pass

    async def interrupt(self) -> None:
        """Cancel the current generation."""
        if self._session is not None:
            try:
                # Signal cancellation via queue sentinel
                await self._input_queue.put(None)
            except Exception as exc:
                logger.warning("Gemini interrupt failed", error=str(exc))

    async def send_tool_result(self, tool_call_id: str, result: dict[str, Any]) -> None:
        """Send a function result back to Gemini."""
        if self._session is None:
            return
        try:
            function_response = {
                "function_response": {
                    "name": tool_call_id,
                    "response": result,
                }
            }
            # In Gemini Live, we send the tool response as a message part
            await self._session.send_message_async(
                content={"role": "tool", "parts": [function_response]}
            )
        except Exception as exc:
            logger.error("Failed to send tool result to Gemini", error=str(exc))

    async def disconnect(self) -> None:
        self._connected = False
        if self._listen_task and not self._listen_task.done():
            self._listen_task.cancel()
            try:
                await self._listen_task
            except asyncio.CancelledError:
                pass
        self._session = None
        self._client = None
        logger.info("Gemini Live disconnected")

    async def _listen_loop(self) -> None:
        """Stream audio chunks to Gemini and receive responses."""
        if self._session is None:
            return

        try:
            # Process queued audio chunks
            audio_buffer = bytearray()
            CHUNK_FLUSH_SIZE = 4096  # bytes before sending to model

            while self._connected:
                try:
                    chunk = await asyncio.wait_for(self._input_queue.get(), timeout=0.1)
                except asyncio.TimeoutError:
                    # Flush buffer if it has data
                    if audio_buffer:
                        await self._process_audio_and_respond(bytes(audio_buffer))
                        audio_buffer.clear()
                    continue

                if chunk is None:
                    # Interrupt sentinel
                    audio_buffer.clear()
                    continue

                audio_buffer.extend(chunk)
                if len(audio_buffer) >= CHUNK_FLUSH_SIZE:
                    await self._process_audio_and_respond(bytes(audio_buffer))
                    audio_buffer.clear()

        except asyncio.CancelledError:
            pass
        except Exception as exc:
            logger.error("Gemini listener error", error=str(exc))
            self._connected = False
            if self.on_error:
                await self.on_error("provider_error", str(exc))

    async def _process_audio_and_respond(self, audio_data: bytes) -> None:
        """Send audio to Gemini and handle the streaming response."""
        if self._session is None:
            return

        try:
            import google.generativeai as genai

            audio_part = {
                "inline_data": {
                    "mime_type": "audio/pcm;rate=24000",
                    "data": base64.b64encode(audio_data).decode(),
                }
            }

            if self.on_transcript:
                await self.on_transcript("", "assistant", False)  # thinking signal

            response = await self._session.send_message_async(
                content={"role": "user", "parts": [audio_part]},
                stream=True,
            )

            full_text = ""
            turn_id = str(uuid.uuid4())

            async for chunk in response:
                if not self._connected:
                    break

                # Handle text
                if chunk.text and self.on_transcript:
                    full_text += chunk.text
                    await self.on_transcript(chunk.text, "assistant", False)

                # Handle audio
                for part in chunk.parts or []:
                    if hasattr(part, "inline_data") and part.inline_data:
                        if "audio" in part.inline_data.mime_type:
                            audio_bytes = base64.b64decode(part.inline_data.data)
                            if self.on_audio:
                                await self.on_audio(audio_bytes, self._next_sequence())

                    # Handle function calls
                    if hasattr(part, "function_call") and part.function_call:
                        fc = part.function_call
                        call_id = str(uuid.uuid4())
                        args = dict(fc.args) if fc.args else {}
                        if self.on_tool_call:
                            await self.on_tool_call(call_id, fc.name, args)

            # Emit final transcript
            if full_text and self.on_transcript:
                await self.on_transcript(full_text, "assistant", True)

        except Exception as exc:
            logger.error("Gemini audio processing error", error=str(exc))
            if self.on_error:
                await self.on_error("gemini_error", str(exc))
