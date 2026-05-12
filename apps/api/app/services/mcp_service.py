from __future__ import annotations

import asyncio
import json
import time
import uuid
from typing import Any, Optional

import structlog
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.redis_client import redis_publish, redis_subscribe
from app.models.tool import McpTool, ToolLog
from app.schemas.tool import ToolExecuteResponse

logger = structlog.get_logger(__name__)

TOOL_APPROVAL_TIMEOUT_SECONDS = 30


class ToolResult:
    def __init__(
        self,
        success: bool,
        data: Optional[dict[str, Any]] = None,
        error: Optional[str] = None,
        duration_ms: int = 0,
    ):
        self.success = success
        self.data = data or {}
        self.error = error
        self.duration_ms = duration_ms


class MCPOrchestrator:
    def __init__(self, db: AsyncSession, workspace_id: uuid.UUID):
        self.db = db
        self.workspace_id = workspace_id

    async def discover_tools(self) -> list[dict[str, Any]]:
        """Return all active tools for this workspace with their schemas."""
        result = await self.db.execute(
            select(McpTool).where(
                and_(
                    McpTool.workspace_id == self.workspace_id,
                    McpTool.is_active == True,
                )
            )
        )
        tools = result.scalars().all()
        return [
            {
                "name": t.name,
                "description": t.description,
                "integration_type": t.integration_type,
                "schema": t.schema_,
                "requires_approval": t.requires_approval,
            }
            for t in tools
        ]

    async def execute_tool(
        self,
        tool_name: str,
        args: dict[str, Any],
        conversation_id: uuid.UUID,
        tool_call_id: str,
        requires_approval: bool = False,
    ) -> ToolExecuteResponse:
        """
        Execute a tool by name, optionally requesting user approval first.
        """
        # Load the tool record
        result = await self.db.execute(
            select(McpTool).where(
                and_(
                    McpTool.workspace_id == self.workspace_id,
                    McpTool.name == tool_name,
                    McpTool.is_active == True,
                )
            )
        )
        tool = result.scalar_one_or_none()
        if tool is None:
            return ToolExecuteResponse(
                tool_call_id=tool_call_id,
                tool_name=tool_name,
                status="error",
                error=f"Tool '{tool_name}' not found or inactive",
                duration_ms=0,
            )

        effective_approval = requires_approval or tool.requires_approval

        # Create a pending log entry
        log = ToolLog(
            conversation_id=conversation_id,
            tool_id=tool.id,
            input_=args,
            status="pending",
        )
        self.db.add(log)
        await self.db.flush()

        if effective_approval:
            approved = await self._request_approval(tool_call_id, tool_name, args, conversation_id)
            if not approved:
                log.status = "rejected"
                await self.db.flush()
                return ToolExecuteResponse(
                    tool_call_id=tool_call_id,
                    tool_name=tool_name,
                    status="rejected",
                    error="User rejected tool execution",
                    duration_ms=0,
                )

        start_ms = int(time.monotonic() * 1000)
        try:
            tool_result = await self._dispatch_tool(tool, args)
            duration_ms = int(time.monotonic() * 1000) - start_ms

            log.status = "success" if tool_result.success else "error"
            log.output = tool_result.data
            log.error_message = tool_result.error
            log.duration_ms = duration_ms
            await self.db.flush()

            return ToolExecuteResponse(
                tool_call_id=tool_call_id,
                tool_name=tool_name,
                result=tool_result.data,
                error=tool_result.error,
                status="success" if tool_result.success else "error",
                duration_ms=duration_ms,
            )
        except Exception as exc:
            duration_ms = int(time.monotonic() * 1000) - start_ms
            log.status = "error"
            log.error_message = str(exc)
            log.duration_ms = duration_ms
            await self.db.flush()

            logger.error("Tool execution failed", tool=tool_name, error=str(exc))
            return ToolExecuteResponse(
                tool_call_id=tool_call_id,
                tool_name=tool_name,
                status="error",
                error=str(exc),
                duration_ms=duration_ms,
            )

    async def _request_approval(
        self,
        tool_call_id: str,
        tool_name: str,
        args: dict[str, Any],
        conversation_id: uuid.UUID,
    ) -> bool:
        """
        Publish a tool approval request via Redis pubsub and wait for client response.
        """
        approval_channel = f"tool_approval:{str(conversation_id)}"
        response_channel = f"tool_approval_response:{tool_call_id}"

        await redis_publish(
            approval_channel,
            {
                "type": "tool.approval_request",
                "tool_call_id": tool_call_id,
                "tool_name": tool_name,
                "args": args,
            },
        )

        pubsub = await redis_subscribe(response_channel)
        try:
            deadline = time.monotonic() + TOOL_APPROVAL_TIMEOUT_SECONDS
            async for message in pubsub.listen():
                if message["type"] == "message":
                    try:
                        data = json.loads(message["data"])
                        return data.get("approved", False)
                    except (json.JSONDecodeError, KeyError):
                        return False
                if time.monotonic() > deadline:
                    break
        except asyncio.TimeoutError:
            pass
        finally:
            await pubsub.unsubscribe(response_channel)

        return False  # Timed out, deny by default

    async def _dispatch_tool(self, tool: McpTool, args: dict[str, Any]) -> ToolResult:
        """Route tool execution to the appropriate integration handler."""
        from app.mcp.gmail_integration import GmailIntegration
        from app.mcp.slack_integration import SlackIntegration
        from app.mcp.calendar_integration import CalendarIntegration

        integration_map = {
            "gmail": GmailIntegration,
            "slack": SlackIntegration,
            "calendar": CalendarIntegration,
        }

        integration_cls = integration_map.get(tool.integration_type)
        if integration_cls is None:
            # Generic / custom tool — reflect args back as result for now
            logger.warning(
                "No integration handler for tool type",
                integration_type=tool.integration_type,
            )
            return ToolResult(success=True, data={"message": "Tool executed", "args": args})

        integration = integration_cls(config=tool.config)
        return await integration.execute(tool.name, args)
