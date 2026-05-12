from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Awaitable, Callable, Optional


# Callback type aliases
OnTranscriptCallback = Callable[[str, str, bool], Awaitable[None]]  # (text, role, is_final)
OnAudioCallback = Callable[[bytes, int], Awaitable[None]]  # (audio_chunk, sequence)
OnToolCallCallback = Callable[[str, str, dict[str, Any]], Awaitable[None]]  # (id, name, args)
OnDoneCallback = Callable[[], Awaitable[None]]
OnErrorCallback = Callable[[str, str], Awaitable[None]]  # (code, message)


class BaseVoiceProvider(ABC):
    """Abstract interface for all voice AI providers (OpenAI Realtime, Gemini Live, etc.)"""

    def __init__(self):
        self.on_transcript: Optional[OnTranscriptCallback] = None
        self.on_audio: Optional[OnAudioCallback] = None
        self.on_tool_call: Optional[OnToolCallCallback] = None
        self.on_done: Optional[OnDoneCallback] = None
        self.on_error: Optional[OnErrorCallback] = None
        self._audio_sequence: int = 0

    @abstractmethod
    async def connect(
        self,
        api_key: str,
        model: str,
        system_prompt: str,
        voice: Optional[str] = None,
        tools: Optional[list[dict[str, Any]]] = None,
    ) -> None:
        """Establish connection to the provider's realtime API."""

    @abstractmethod
    async def send_audio(self, audio_chunk: bytes) -> None:
        """Stream a PCM audio chunk to the provider."""

    @abstractmethod
    async def commit_audio(self) -> None:
        """Signal end of user audio turn."""

    @abstractmethod
    async def interrupt(self) -> None:
        """Cancel the current ongoing model response."""

    @abstractmethod
    async def send_tool_result(self, tool_call_id: str, result: dict[str, Any]) -> None:
        """Return a tool execution result to the provider."""

    @abstractmethod
    async def disconnect(self) -> None:
        """Close the connection cleanly."""

    @property
    def is_connected(self) -> bool:
        return False

    def _next_sequence(self) -> int:
        self._audio_sequence += 1
        return self._audio_sequence
