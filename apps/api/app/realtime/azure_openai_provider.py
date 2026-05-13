from __future__ import annotations

from typing import Any, Optional

import structlog
import websockets

from app.realtime.openai_provider import OpenAIRealtimeProvider

logger = structlog.get_logger(__name__)


class AzureOpenAIRealtimeProvider(OpenAIRealtimeProvider):
    """
    Azure OpenAI Realtime API provider.
    Identical protocol to OpenAI Realtime — only the endpoint and auth header differ.
    Endpoint format: wss://{resource}.openai.azure.com/openai/realtime
                     ?api-version=2024-10-01-preview&deployment={deployment}
    """

    def __init__(self, azure_endpoint: str):
        super().__init__()
        # Normalise: strip trailing slash, ensure https->wss
        self._azure_endpoint = (
            azure_endpoint.rstrip("/")
            .replace("https://", "wss://")
            .replace("http://", "ws://")
        )

    async def connect(
        self,
        api_key: str,
        model: str,
        system_prompt: str,
        voice: Optional[str] = "alloy",
        tools: Optional[list[dict[str, Any]]] = None,
    ) -> None:
        url = (
            f"{self._azure_endpoint}/openai/realtime"
            f"?api-version=2024-10-01-preview&deployment={model}"
        )

        # Azure uses api-key header; OpenAI-Beta header still required
        headers = {
            "api-key": api_key,
            "OpenAI-Beta": "realtime=v1",
        }

        try:
            self._ws = await websockets.connect(url, additional_headers=headers)
            self._connected = True
            logger.info("Azure OpenAI Realtime connected", deployment=model, endpoint=self._azure_endpoint)
        except Exception as exc:
            logger.error("Azure OpenAI Realtime connection failed", error=str(exc))
            raise

        # Session config and listener are identical to OpenAI — delegate to parent
        await self._configure_session(system_prompt, voice, tools)

    async def _configure_session(
        self,
        system_prompt: str,
        voice: Optional[str],
        tools: Optional[list[dict[str, Any]]],
    ) -> None:
        import asyncio
        from typing import Any

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
        self._listen_task = asyncio.create_task(self._listen_loop())
