from __future__ import annotations

import base64
from email.mime.text import MIMEText
from typing import Any

import httpx
import structlog

from app.mcp.base_integration import BaseMCPIntegration
from app.services.mcp_service import ToolResult

logger = structlog.get_logger(__name__)

GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1"


class GmailIntegration(BaseMCPIntegration):
    """
    Gmail MCP integration.
    Supports: list_emails, get_email, send_email, search_emails, create_draft
    """

    def __init__(self, config: dict[str, Any]):
        super().__init__(config)
        self._access_token: str = config.get("access_token", "")

    def get_tool_schemas(self) -> list[dict[str, Any]]:
        return [
            {
                "name": "gmail_list_emails",
                "description": "List recent emails from Gmail inbox",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "max_results": {"type": "integer", "default": 10},
                        "label_ids": {"type": "array", "items": {"type": "string"}},
                        "q": {"type": "string", "description": "Gmail search query"},
                    },
                },
            },
            {
                "name": "gmail_get_email",
                "description": "Get the full content of a specific email",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "message_id": {"type": "string", "description": "Gmail message ID"},
                    },
                    "required": ["message_id"],
                },
            },
            {
                "name": "gmail_send_email",
                "description": "Send an email via Gmail",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "to": {"type": "string", "description": "Recipient email address"},
                        "subject": {"type": "string"},
                        "body": {"type": "string"},
                        "cc": {"type": "string"},
                    },
                    "required": ["to", "subject", "body"],
                },
            },
            {
                "name": "gmail_search_emails",
                "description": "Search emails using Gmail query syntax",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "Gmail search query"},
                        "max_results": {"type": "integer", "default": 10},
                    },
                    "required": ["query"],
                },
            },
        ]

    async def execute(self, tool_name: str, args: dict[str, Any]) -> ToolResult:
        if not self._access_token:
            return self._error("Gmail access token not configured")

        dispatch = {
            "gmail_list_emails": self._list_emails,
            "gmail_get_email": self._get_email,
            "gmail_send_email": self._send_email,
            "gmail_search_emails": self._search_emails,
        }

        handler = dispatch.get(tool_name)
        if handler is None:
            return self._error(f"Unknown Gmail tool: {tool_name}")

        try:
            return await handler(args)
        except Exception as exc:
            logger.error("Gmail tool execution failed", tool=tool_name, error=str(exc))
            return self._error(str(exc))

    def _headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self._access_token}"}

    async def _list_emails(self, args: dict[str, Any]) -> ToolResult:
        max_results = args.get("max_results", 10)
        params: dict[str, Any] = {"maxResults": max_results, "userId": "me"}
        if label_ids := args.get("label_ids"):
            params["labelIds"] = label_ids
        if q := args.get("q"):
            params["q"] = q

        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{GMAIL_API_BASE}/users/me/messages",
                headers=self._headers(),
                params=params,
                timeout=10.0,
            )
        resp.raise_for_status()
        data = resp.json()
        messages = data.get("messages", [])
        return self._success({"messages": messages, "result_size": len(messages)})

    async def _get_email(self, args: dict[str, Any]) -> ToolResult:
        message_id = args["message_id"]
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{GMAIL_API_BASE}/users/me/messages/{message_id}",
                headers=self._headers(),
                params={"userId": "me", "format": "full"},
                timeout=10.0,
            )
        resp.raise_for_status()
        return self._success(resp.json())

    async def _send_email(self, args: dict[str, Any]) -> ToolResult:
        msg = MIMEText(args["body"])
        msg["to"] = args["to"]
        msg["subject"] = args["subject"]
        if cc := args.get("cc"):
            msg["cc"] = cc

        raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{GMAIL_API_BASE}/users/me/messages/send",
                headers={**self._headers(), "Content-Type": "application/json"},
                json={"raw": raw},
                timeout=15.0,
            )
        resp.raise_for_status()
        return self._success({"message_id": resp.json().get("id"), "status": "sent"})

    async def _search_emails(self, args: dict[str, Any]) -> ToolResult:
        return await self._list_emails({**args, "q": args["query"]})
