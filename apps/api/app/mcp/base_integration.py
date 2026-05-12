from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

import structlog

from app.mcp.schemas import ToolResult
from app.services.mcp_service import ToolResult as ServiceToolResult

logger = structlog.get_logger(__name__)


class BaseMCPIntegration(ABC):
    """Abstract base class for all MCP tool integrations."""

    def __init__(self, config: dict[str, Any]):
        self.config = config

    @abstractmethod
    async def execute(self, tool_name: str, args: dict[str, Any]) -> ServiceToolResult:
        """Execute the named tool with the provided arguments."""

    @abstractmethod
    def get_tool_schemas(self) -> list[dict[str, Any]]:
        """Return the list of tool schemas this integration provides."""

    def _success(self, data: dict[str, Any]) -> ServiceToolResult:
        return ServiceToolResult(success=True, data=data)

    def _error(self, message: str) -> ServiceToolResult:
        return ServiceToolResult(success=False, error=message)
