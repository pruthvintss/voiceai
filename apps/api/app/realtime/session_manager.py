from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

import structlog

from app.core.redis_client import get_redis, redis_delete, redis_get_json, redis_set_json

logger = structlog.get_logger(__name__)

SESSION_TTL_SECONDS = 3600  # 1 hour
SESSION_KEY_PREFIX = "voice_session:"


def _session_key(session_id: str) -> str:
    return f"{SESSION_KEY_PREFIX}{session_id}"


class ActiveSession:
    def __init__(
        self,
        session_id: str,
        conversation_id: str,
        user_id: str,
        workspace_id: str,
        provider: str,
        model: str,
    ):
        self.session_id = session_id
        self.conversation_id = conversation_id
        self.user_id = user_id
        self.workspace_id = workspace_id
        self.provider = provider
        self.model = model
        self.started_at = datetime.now(tz=timezone.utc).isoformat()
        self.status = "active"

    def to_dict(self) -> dict[str, Any]:
        return {
            "session_id": self.session_id,
            "conversation_id": self.conversation_id,
            "user_id": self.user_id,
            "workspace_id": self.workspace_id,
            "provider": self.provider,
            "model": self.model,
            "started_at": self.started_at,
            "status": self.status,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "ActiveSession":
        session = cls(
            session_id=data["session_id"],
            conversation_id=data["conversation_id"],
            user_id=data["user_id"],
            workspace_id=data["workspace_id"],
            provider=data["provider"],
            model=data["model"],
        )
        session.started_at = data.get("started_at", session.started_at)
        session.status = data.get("status", "active")
        return session


async def create_session(
    user_id: uuid.UUID,
    workspace_id: uuid.UUID,
    conversation_id: uuid.UUID,
    provider: str,
    model: str,
) -> ActiveSession:
    """Register a new active session in Redis."""
    session_id = str(uuid.uuid4())
    session = ActiveSession(
        session_id=session_id,
        conversation_id=str(conversation_id),
        user_id=str(user_id),
        workspace_id=str(workspace_id),
        provider=provider,
        model=model,
    )
    await redis_set_json(_session_key(session_id), session.to_dict(), expire=SESSION_TTL_SECONDS)
    logger.info("Session created", session_id=session_id, provider=provider)
    return session


async def get_session(session_id: str) -> Optional[ActiveSession]:
    """Load a session from Redis."""
    data = await redis_get_json(_session_key(session_id))
    if data is None:
        return None
    return ActiveSession.from_dict(data)


async def update_session_status(session_id: str, status: str) -> None:
    """Update the status field of a session."""
    data = await redis_get_json(_session_key(session_id))
    if data:
        data["status"] = status
        await redis_set_json(_session_key(session_id), data, expire=SESSION_TTL_SECONDS)


async def end_session(session_id: str) -> None:
    """Remove a session from Redis."""
    await redis_delete(_session_key(session_id))
    logger.info("Session ended", session_id=session_id)


async def count_active_sessions(workspace_id: str) -> int:
    """Count active sessions for a workspace."""
    client = await get_redis()
    keys = await client.keys(f"{SESSION_KEY_PREFIX}*")
    count = 0
    for key in keys:
        data = await redis_get_json(key)
        if data and data.get("workspace_id") == workspace_id and data.get("status") == "active":
            count += 1
    return count
