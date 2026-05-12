from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


MEMORY_CATEGORIES = (
    "preferences",
    "facts",
    "tasks",
    "relationships",
    "business",
    "issues",
    "patterns",
)


class MemoryCreate(BaseModel):
    category: str = Field(description="One of: " + ", ".join(MEMORY_CATEGORIES))
    content: str = Field(min_length=1, max_length=10000)
    importance_score: float = Field(default=0.5, ge=0.0, le=1.0)


class MemoryUpdate(BaseModel):
    category: Optional[str] = None
    content: Optional[str] = Field(default=None, min_length=1, max_length=10000)
    importance_score: Optional[float] = Field(default=None, ge=0.0, le=1.0)


class MemoryResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    user_id: uuid.UUID
    category: str
    content: str
    importance_score: float
    source_conversation_id: Optional[uuid.UUID] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    last_accessed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class MemorySearchResult(MemoryResponse):
    similarity_score: float


class MemoryListResponse(BaseModel):
    items: list[MemoryResponse]
    total: int
    page: int
    page_size: int
    has_next: bool


class MemorySearchResponse(BaseModel):
    items: list[MemorySearchResult]
    query: str
    total: int
