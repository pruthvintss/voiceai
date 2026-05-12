from __future__ import annotations

from typing import Any

# -----------------------------------------------------------------------
# Message type constants (client -> server)
# -----------------------------------------------------------------------
MSG_SESSION_START = "session.start"
MSG_AUDIO_CHUNK = "audio.chunk"
MSG_AUDIO_END = "audio.end"
MSG_INTERRUPT = "interrupt"
MSG_TOOL_RESPONSE = "tool.response"
MSG_SESSION_END = "session.end"

# -----------------------------------------------------------------------
# Message type constants (server -> client)
# -----------------------------------------------------------------------
MSG_SESSION_READY = "session.ready"
MSG_TRANSCRIPT_PARTIAL = "transcript.partial"
MSG_TRANSCRIPT_FINAL = "transcript.final"
MSG_AUDIO_RESPONSE = "audio.response"
MSG_TOOL_CALL = "tool.call"
MSG_AGENT_THINKING = "agent.thinking"
MSG_AGENT_SPEAKING = "agent.speaking"
MSG_SESSION_ENDED = "session.ended"
MSG_ERROR = "error"


def make_session_ready(session_id: str, conversation_id: str, context_injected: bool) -> dict[str, Any]:
    return {
        "type": MSG_SESSION_READY,
        "session_id": session_id,
        "conversation_id": str(conversation_id),
        "context_injected": context_injected,
    }


def make_transcript_partial(text: str, role: str) -> dict[str, Any]:
    return {"type": MSG_TRANSCRIPT_PARTIAL, "text": text, "role": role}


def make_transcript_final(text: str, role: str, turn_id: str) -> dict[str, Any]:
    return {"type": MSG_TRANSCRIPT_FINAL, "text": text, "role": role, "turn_id": turn_id}


def make_audio_response(data: str, sequence: int) -> dict[str, Any]:
    return {"type": MSG_AUDIO_RESPONSE, "data": data, "sequence": sequence}


def make_tool_call(
    tool_call_id: str, tool_name: str, args: dict, requires_approval: bool = False
) -> dict[str, Any]:
    return {
        "type": MSG_TOOL_CALL,
        "tool_call_id": tool_call_id,
        "tool_name": tool_name,
        "args": args,
        "requires_approval": requires_approval,
    }


def make_agent_thinking() -> dict[str, Any]:
    return {"type": MSG_AGENT_THINKING}


def make_agent_speaking() -> dict[str, Any]:
    return {"type": MSG_AGENT_SPEAKING}


def make_session_ended(conversation_id: str, duration_seconds: float | None = None) -> dict[str, Any]:
    return {
        "type": MSG_SESSION_ENDED,
        "conversation_id": str(conversation_id),
        "duration_seconds": duration_seconds,
    }


def make_error(code: str, message: str) -> dict[str, Any]:
    return {"type": MSG_ERROR, "code": code, "message": message}
