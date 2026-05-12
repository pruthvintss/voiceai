from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tool import McpTool
from app.models.workspace import Workspace
from app.services.mcp_service import MCPOrchestrator, ToolResult


@pytest.mark.asyncio
async def test_list_tools_empty(
    client: AsyncClient, auth_headers: dict, test_workspace: Workspace
):
    """Empty tool list for new workspace."""
    response = await client.get(
        f"/api/v1/workspaces/{test_workspace.id}/tools",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_create_tool(
    client: AsyncClient, auth_headers: dict, test_workspace: Workspace
):
    """Admin can create a tool."""
    response = await client.post(
        f"/api/v1/workspaces/{test_workspace.id}/tools",
        headers=auth_headers,
        json={
            "name": "send_slack_message",
            "description": "Send a message to Slack",
            "integration_type": "slack",
            "config": {"bot_token": "xoxb-test"},
            "schema": {
                "type": "object",
                "properties": {
                    "channel": {"type": "string"},
                    "text": {"type": "string"},
                },
                "required": ["channel", "text"],
            },
            "requires_approval": False,
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "send_slack_message"
    assert data["integration_type"] == "slack"
    assert data["is_active"] is True


@pytest.mark.asyncio
async def test_tool_orchestrator_discover(
    db_session: AsyncSession, test_workspace: Workspace
):
    """MCPOrchestrator discovers active tools."""
    tool = McpTool(
        workspace_id=test_workspace.id,
        name="gmail_send",
        integration_type="gmail",
        config={},
        schema_={"type": "object"},
        is_active=True,
    )
    db_session.add(tool)
    await db_session.flush()

    orchestrator = MCPOrchestrator(db=db_session, workspace_id=test_workspace.id)
    tools = await orchestrator.discover_tools()

    assert len(tools) >= 1
    tool_names = [t["name"] for t in tools]
    assert "gmail_send" in tool_names


@pytest.mark.asyncio
async def test_tool_orchestrator_execute_unknown():
    """Executing unknown tool returns error result."""
    mock_db = AsyncMock()
    mock_db.execute = AsyncMock()
    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = result_mock
    mock_db.add = MagicMock()
    mock_db.flush = AsyncMock()

    orchestrator = MCPOrchestrator(db=mock_db, workspace_id=uuid.uuid4())
    response = await orchestrator.execute_tool(
        tool_name="nonexistent_tool",
        args={},
        conversation_id=uuid.uuid4(),
        tool_call_id="test-call-1",
    )

    assert response.status == "error"
    assert "not found" in response.error.lower()


@pytest.mark.asyncio
async def test_gmail_integration_no_token():
    """Gmail integration returns error without access token."""
    from app.mcp.gmail_integration import GmailIntegration

    integration = GmailIntegration(config={})
    result = await integration.execute("gmail_list_emails", {})
    assert result.success is False
    assert "access token" in result.error.lower()


@pytest.mark.asyncio
async def test_slack_integration_no_token():
    """Slack integration returns error without bot token."""
    from app.mcp.slack_integration import SlackIntegration

    integration = SlackIntegration(config={})
    result = await integration.execute("slack_post_message", {"channel": "#general", "text": "hi"})
    assert result.success is False
    assert "bot token" in result.error.lower()
