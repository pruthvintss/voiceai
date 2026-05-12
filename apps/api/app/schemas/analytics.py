from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class ConversationAnalyticsResponse(BaseModel):
    id: uuid.UUID
    conversation_id: uuid.UUID
    total_turns: int
    user_turns: int
    agent_turns: int
    avg_response_latency_ms: Optional[float] = None
    interruption_count: int
    tools_called: int
    words_spoken_user: int
    words_spoken_agent: int
    topics: list[str]
    sentiment_timeline: list[dict[str, Any]]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class WorkspaceAnalyticsSummary(BaseModel):
    workspace_id: uuid.UUID
    period_start: datetime
    period_end: datetime
    total_conversations: int
    total_duration_seconds: float
    avg_duration_seconds: float
    total_words_spoken: int
    total_tools_called: int
    sentiment_breakdown: dict[str, int]
    top_topics: list[dict[str, Any]]
    conversations_by_day: list[dict[str, Any]]
    avg_latency_ms: Optional[float] = None


class UserAnalyticsSummary(BaseModel):
    user_id: uuid.UUID
    workspace_id: uuid.UUID
    period_start: datetime
    period_end: datetime
    total_conversations: int
    total_duration_seconds: float
    memories_extracted: int
    tools_called: int
