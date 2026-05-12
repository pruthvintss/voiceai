from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel


class ToolSchema(BaseModel):
    name: str
    description: str
    parameters: dict[str, Any]  # JSON Schema for tool parameters
    integration_type: str
    requires_approval: bool = False


class ToolResult(BaseModel):
    success: bool
    data: dict[str, Any] = {}
    error: Optional[str] = None
    metadata: dict[str, Any] = {}
