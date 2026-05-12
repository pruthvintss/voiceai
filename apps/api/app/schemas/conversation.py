from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class TranscriptTurnSchema(BaseModel):
    role: str
    content: str
    timestamp: datetime
    is_interrupted: bool = False
    turn_id: Optional[str] = None


class TranscriptSchema(BaseModel):
    id: uuid.UUID
    conversation_id: uuid.UUID
    turns: list[TranscriptTurnSchema]
    raw_audio_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ConversationResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    user_id: uuid.UUID
    title: Optional[str] = None
    provider: str
    model: str
    status: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    metadata_: Optional[dict[str, Any]] = None

    model_config = {"from_attributes": True}


class ConversationDetailResponse(ConversationResponse):
    transcript: Optional[TranscriptSchema] = None


class ConversationListResponse(BaseModel):
    items: list[ConversationResponse]
    total: int
    page: int
    page_size: int
    has_next: bool
