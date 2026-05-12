from __future__ import annotations

import uuid
from typing import Any, Optional

from pydantic import BaseModel, Field


# -----------------------------------------------------------------------
# Client -> Server messages
# -----------------------------------------------------------------------

class SessionStartMessage(BaseModel):
    type: str = "session.start"
    provider: str = Field(description="openai | gemini")
    model: str
    workspace_id: uuid.UUID
    api_key_id: Optional[uuid.UUID] = None  # which BYOK key to use
    system_prompt: Optional[str] = None
    voice: Optional[str] = None  # e.g. "alloy", "echo"
    language: Optional[str] = "en"


class AudioChunkMessage(BaseModel):
    type: str = "audio.chunk"
    data: str  # base64-encoded PCM audio
    sequence: int


class AudioEndMessage(BaseModel):
    type: str = "audio.end"


class InterruptMessage(BaseModel):
    type: str = "interrupt"


class ToolResponseMessage(BaseModel):
    type: str = "tool.response"
    tool_call_id: str
    result: dict[str, Any]


class SessionEndMessage(BaseModel):
    type: str = "session.end"


# -----------------------------------------------------------------------
# Server -> Client messages
# -----------------------------------------------------------------------

class SessionReadyMessage(BaseModel):
    type: str = "session.ready"
    session_id: str
    conversation_id: str
    context_injected: bool


class TranscriptPartialMessage(BaseModel):
    type: str = "transcript.partial"
    text: str
    role: str


class TranscriptFinalMessage(BaseModel):
    type: str = "transcript.final"
    text: str
    role: str
    turn_id: str


class AudioResponseMessage(BaseModel):
    type: str = "audio.response"
    data: str  # base64-encoded PCM
    sequence: int


class ToolCallMessage(BaseModel):
    type: str = "tool.call"
    tool_call_id: str
    tool_name: str
    args: dict[str, Any]
    requires_approval: bool = False


class AgentThinkingMessage(BaseModel):
    type: str = "agent.thinking"


class AgentSpeakingMessage(BaseModel):
    type: str = "agent.speaking"


class SessionEndedMessage(BaseModel):
    type: str = "session.ended"
    conversation_id: str
    duration_seconds: Optional[float] = None


class ErrorMessage(BaseModel):
    type: str = "error"
    code: str
    message: str


# -----------------------------------------------------------------------
# Context bundle (used in session startup)
# -----------------------------------------------------------------------

class ContextBundle(BaseModel):
    application_context: str = ""
    retrieved_memory: str = ""
    recent_call_summary: str = ""
    retrieved_documents: str = ""
    user_preferences: str = ""
    active_tasks: str = ""
    total_tokens: int = 0

    def to_system_prompt_block(self) -> str:
        parts = []
        if self.application_context:
            parts.append(f"## Application Context\n{self.application_context}")
        if self.recent_call_summary:
            parts.append(f"## Recent Call Summary\n{self.recent_call_summary}")
        if self.retrieved_memory:
            parts.append(f"## Relevant Memories\n{self.retrieved_memory}")
        if self.user_preferences:
            parts.append(f"## User Preferences\n{self.user_preferences}")
        if self.active_tasks:
            parts.append(f"## Active Tasks\n{self.active_tasks}")
        if self.retrieved_documents:
            parts.append(f"## Relevant Documents\n{self.retrieved_documents}")
        return "\n\n".join(parts)
