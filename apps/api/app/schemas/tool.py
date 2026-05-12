from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class McpToolCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    integration_type: str = Field(
        description="gmail | slack | calendar | crm | jira | custom"
    )
    config: dict[str, Any] = Field(default_factory=dict)
    schema_: dict[str, Any] = Field(default_factory=dict, alias="schema")
    requires_approval: bool = False

    model_config = {"populate_by_name": True}


class McpToolUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = None
    config: Optional[dict[str, Any]] = None
    schema_: Optional[dict[str, Any]] = Field(default=None, alias="schema")
    is_active: Optional[bool] = None
    requires_approval: Optional[bool] = None

    model_config = {"populate_by_name": True}


class McpToolResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    name: str
    description: Optional[str] = None
    integration_type: str
    schema_: dict[str, Any] = Field(alias="schema")
    is_active: bool
    requires_approval: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True, "populate_by_name": True}


class ToolLogResponse(BaseModel):
    id: uuid.UUID
    conversation_id: uuid.UUID
    tool_id: uuid.UUID
    input_: dict[str, Any] = Field(alias="input")
    output: Optional[dict[str, Any]] = None
    status: str
    error_message: Optional[str] = None
    duration_ms: Optional[int] = None
    created_at: datetime

    model_config = {"from_attributes": True, "populate_by_name": True}


class ToolExecuteRequest(BaseModel):
    tool_name: str
    args: dict[str, Any]
    conversation_id: Optional[uuid.UUID] = None


class ToolExecuteResponse(BaseModel):
    tool_call_id: str
    tool_name: str
    result: Optional[dict[str, Any]] = None
    error: Optional[str] = None
    status: str
    duration_ms: int
