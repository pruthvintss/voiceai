from __future__ import annotations

from typing import Any

import httpx
import structlog

from app.mcp.base_integration import BaseMCPIntegration
from app.services.mcp_service import ToolResult

logger = structlog.get_logger(__name__)

SLACK_API_BASE = "https://slack.com/api"


class SlackIntegration(BaseMCPIntegration):
    """
    Slack MCP integration.
    Supports: post_message, list_channels, get_channel_history, search_messages
    """

    def __init__(self, config: dict[str, Any]):
        super().__init__(config)
        self._bot_token: str = config.get("bot_token", "")

    def get_tool_schemas(self) -> list[dict[str, Any]]:
        return [
            {
                "name": "slack_post_message",
                "description": "Post a message to a Slack channel",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "channel": {"type": "string", "description": "Channel ID or name"},
                        "text": {"type": "string", "description": "Message text"},
                        "thread_ts": {"type": "string", "description": "Optional thread timestamp for replies"},
                    },
                    "required": ["channel", "text"],
                },
            },
            {
                "name": "slack_list_channels",
                "description": "List available Slack channels",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "limit": {"type": "integer", "default": 50},
                    },
                },
            },
            {
                "name": "slack_get_channel_history",
                "description": "Get recent messages from a Slack channel",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "channel": {"type": "string"},
                        "limit": {"type": "integer", "default": 20},
                    },
                    "required": ["channel"],
                },
            },
            {
                "name": "slack_search_messages",
                "description": "Search messages across Slack",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string"},
                        "count": {"type": "integer", "default": 20},
                    },
                    "required": ["query"],
                },
            },
        ]

    async def execute(self, tool_name: str, args: dict[str, Any]) -> ToolResult:
        if not self._bot_token:
            return self._error("Slack bot token not configured")

        dispatch = {
            "slack_post_message": self._post_message,
            "slack_list_channels": self._list_channels,
            "slack_get_channel_history": self._get_channel_history,
            "slack_search_messages": self._search_messages,
        }

        handler = dispatch.get(tool_name)
        if handler is None:
            return self._error(f"Unknown Slack tool: {tool_name}")

        try:
            return await handler(args)
        except Exception as exc:
            logger.error("Slack tool execution failed", tool=tool_name, error=str(exc))
            return self._error(str(exc))

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._bot_token}",
            "Content-Type": "application/json",
        }

    async def _post_message(self, args: dict[str, Any]) -> ToolResult:
        payload: dict[str, Any] = {"channel": args["channel"], "text": args["text"]}
        if thread_ts := args.get("thread_ts"):
            payload["thread_ts"] = thread_ts

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{SLACK_API_BASE}/chat.postMessage",
                headers=self._headers(),
                json=payload,
                timeout=10.0,
            )
        data = resp.json()
        if not data.get("ok"):
            return self._error(data.get("error", "Slack API error"))
        return self._success({"ts": data.get("ts"), "channel": data.get("channel")})

    async def _list_channels(self, args: dict[str, Any]) -> ToolResult:
        params = {"limit": args.get("limit", 50), "exclude_archived": True}
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{SLACK_API_BASE}/conversations.list",
                headers=self._headers(),
                params=params,
                timeout=10.0,
            )
        data = resp.json()
        if not data.get("ok"):
            return self._error(data.get("error", "Slack API error"))
        channels = [
            {"id": c["id"], "name": c["name"], "is_private": c.get("is_private", False)}
            for c in data.get("channels", [])
        ]
        return self._success({"channels": channels})

    async def _get_channel_history(self, args: dict[str, Any]) -> ToolResult:
        params = {"channel": args["channel"], "limit": args.get("limit", 20)}
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{SLACK_API_BASE}/conversations.history",
                headers=self._headers(),
                params=params,
                timeout=10.0,
            )
        data = resp.json()
        if not data.get("ok"):
            return self._error(data.get("error", "Slack API error"))
        messages = [
            {"ts": m.get("ts"), "user": m.get("user"), "text": m.get("text", "")}
            for m in data.get("messages", [])
        ]
        return self._success({"messages": messages})

    async def _search_messages(self, args: dict[str, Any]) -> ToolResult:
        params = {"query": args["query"], "count": args.get("count", 20)}
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{SLACK_API_BASE}/search.messages",
                headers=self._headers(),
                params=params,
                timeout=10.0,
            )
        data = resp.json()
        if not data.get("ok"):
            return self._error(data.get("error", "Slack API error"))
        matches = data.get("messages", {}).get("matches", [])
        return self._success({"matches": matches, "total": len(matches)})
