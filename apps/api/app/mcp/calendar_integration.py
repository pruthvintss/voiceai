from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import httpx
import structlog

from app.mcp.base_integration import BaseMCPIntegration
from app.services.mcp_service import ToolResult

logger = structlog.get_logger(__name__)

GCAL_API_BASE = "https://www.googleapis.com/calendar/v3"


class CalendarIntegration(BaseMCPIntegration):
    """
    Google Calendar MCP integration.
    Supports: list_events, create_event, get_event, update_event, delete_event
    """

    def __init__(self, config: dict[str, Any]):
        super().__init__(config)
        self._access_token: str = config.get("access_token", "")
        self._calendar_id: str = config.get("calendar_id", "primary")

    def get_tool_schemas(self) -> list[dict[str, Any]]:
        return [
            {
                "name": "calendar_list_events",
                "description": "List upcoming calendar events",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "time_min": {"type": "string", "description": "RFC 3339 timestamp"},
                        "time_max": {"type": "string", "description": "RFC 3339 timestamp"},
                        "max_results": {"type": "integer", "default": 10},
                        "query": {"type": "string"},
                    },
                },
            },
            {
                "name": "calendar_create_event",
                "description": "Create a new calendar event",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "summary": {"type": "string", "description": "Event title"},
                        "description": {"type": "string"},
                        "start_datetime": {"type": "string", "description": "ISO 8601 datetime"},
                        "end_datetime": {"type": "string", "description": "ISO 8601 datetime"},
                        "attendees": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "List of attendee email addresses",
                        },
                        "location": {"type": "string"},
                    },
                    "required": ["summary", "start_datetime", "end_datetime"],
                },
            },
            {
                "name": "calendar_get_event",
                "description": "Get details of a specific calendar event",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "event_id": {"type": "string"},
                    },
                    "required": ["event_id"],
                },
            },
            {
                "name": "calendar_update_event",
                "description": "Update an existing calendar event",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "event_id": {"type": "string"},
                        "summary": {"type": "string"},
                        "description": {"type": "string"},
                        "start_datetime": {"type": "string"},
                        "end_datetime": {"type": "string"},
                    },
                    "required": ["event_id"],
                },
            },
        ]

    async def execute(self, tool_name: str, args: dict[str, Any]) -> ToolResult:
        if not self._access_token:
            return self._error("Google Calendar access token not configured")

        dispatch = {
            "calendar_list_events": self._list_events,
            "calendar_create_event": self._create_event,
            "calendar_get_event": self._get_event,
            "calendar_update_event": self._update_event,
        }

        handler = dispatch.get(tool_name)
        if handler is None:
            return self._error(f"Unknown Calendar tool: {tool_name}")

        try:
            return await handler(args)
        except Exception as exc:
            logger.error("Calendar tool execution failed", tool=tool_name, error=str(exc))
            return self._error(str(exc))

    def _headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self._access_token}"}

    async def _list_events(self, args: dict[str, Any]) -> ToolResult:
        now = datetime.now(tz=timezone.utc).isoformat()
        params: dict[str, Any] = {
            "timeMin": args.get("time_min", now),
            "maxResults": args.get("max_results", 10),
            "singleEvents": True,
            "orderBy": "startTime",
        }
        if time_max := args.get("time_max"):
            params["timeMax"] = time_max
        if query := args.get("query"):
            params["q"] = query

        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{GCAL_API_BASE}/calendars/{self._calendar_id}/events",
                headers=self._headers(),
                params=params,
                timeout=10.0,
            )
        resp.raise_for_status()
        events = resp.json().get("items", [])
        simplified = [
            {
                "id": e.get("id"),
                "summary": e.get("summary"),
                "start": e.get("start"),
                "end": e.get("end"),
                "description": e.get("description"),
                "attendees": [a.get("email") for a in e.get("attendees", [])],
            }
            for e in events
        ]
        return self._success({"events": simplified})

    async def _create_event(self, args: dict[str, Any]) -> ToolResult:
        event_body: dict[str, Any] = {
            "summary": args["summary"],
            "start": {"dateTime": args["start_datetime"], "timeZone": "UTC"},
            "end": {"dateTime": args["end_datetime"], "timeZone": "UTC"},
        }
        if description := args.get("description"):
            event_body["description"] = description
        if location := args.get("location"):
            event_body["location"] = location
        if attendees := args.get("attendees", []):
            event_body["attendees"] = [{"email": a} for a in attendees]

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{GCAL_API_BASE}/calendars/{self._calendar_id}/events",
                headers={**self._headers(), "Content-Type": "application/json"},
                json=event_body,
                timeout=10.0,
            )
        resp.raise_for_status()
        data = resp.json()
        return self._success({"event_id": data.get("id"), "html_link": data.get("htmlLink")})

    async def _get_event(self, args: dict[str, Any]) -> ToolResult:
        event_id = args["event_id"]
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{GCAL_API_BASE}/calendars/{self._calendar_id}/events/{event_id}",
                headers=self._headers(),
                timeout=10.0,
            )
        resp.raise_for_status()
        return self._success(resp.json())

    async def _update_event(self, args: dict[str, Any]) -> ToolResult:
        event_id = args.pop("event_id")
        patch_body: dict[str, Any] = {}
        if summary := args.get("summary"):
            patch_body["summary"] = summary
        if description := args.get("description"):
            patch_body["description"] = description
        if start := args.get("start_datetime"):
            patch_body["start"] = {"dateTime": start, "timeZone": "UTC"}
        if end := args.get("end_datetime"):
            patch_body["end"] = {"dateTime": end, "timeZone": "UTC"}

        async with httpx.AsyncClient() as client:
            resp = await client.patch(
                f"{GCAL_API_BASE}/calendars/{self._calendar_id}/events/{event_id}",
                headers={**self._headers(), "Content-Type": "application/json"},
                json=patch_body,
                timeout=10.0,
            )
        resp.raise_for_status()
        data = resp.json()
        return self._success({"event_id": data.get("id"), "updated": True})
