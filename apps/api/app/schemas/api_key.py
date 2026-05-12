from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ApiKeyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    provider: str = Field(description="openai | gemini | anthropic")
    key: str = Field(min_length=10, description="The raw API key (will be encrypted at rest)")

    class Config:
        json_schema_extra = {
            "example": {
                "name": "My OpenAI Key",
                "provider": "openai",
                "key": "sk-proj-...",
            }
        }


class ApiKeyUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    is_active: Optional[bool] = None


class ApiKeyResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    user_id: uuid.UUID
    name: str
    provider: str
    key_preview: str  # masked, e.g. "sk-...abcd"
    is_active: bool
    created_at: datetime
    last_used_at: Optional[datetime] = None
    usage_count: int
    usage_tokens: int

    model_config = {"from_attributes": True}


class ApiKeyValidateResponse(BaseModel):
    valid: bool
    provider: str
    error: Optional[str] = None
    model_list: Optional[list[str]] = None
