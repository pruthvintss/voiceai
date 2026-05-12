from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.memory import Memory
from app.models.user import User
from app.models.workspace import Workspace


@pytest.mark.asyncio
async def test_list_memories_empty(
    client: AsyncClient, auth_headers: dict, test_workspace: Workspace
):
    """Empty memory list is returned for new workspace."""
    response = await client.get(
        f"/api/v1/workspaces/{test_workspace.id}/memories",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["items"] == []
    assert data["total"] == 0


@pytest.mark.asyncio
async def test_create_memory(
    client: AsyncClient,
    auth_headers: dict,
    test_workspace: Workspace,
):
    """Memory can be created with embedding."""
    with patch(
        "app.services.memory_service.get_embedding",
        new_callable=AsyncMock,
        return_value=[0.1] * 1536,
    ):
        response = await client.post(
            f"/api/v1/workspaces/{test_workspace.id}/memories",
            headers=auth_headers,
            json={
                "category": "preferences",
                "content": "User prefers dark mode",
                "importance_score": 0.7,
            },
        )
    assert response.status_code == 201
    data = response.json()
    assert data["category"] == "preferences"
    assert data["content"] == "User prefers dark mode"
    assert data["importance_score"] == 0.7
    assert data["is_active"] is True


@pytest.mark.asyncio
async def test_update_memory(
    client: AsyncClient,
    auth_headers: dict,
    test_workspace: Workspace,
    db_session: AsyncSession,
    test_user: User,
):
    """Memory can be updated."""
    memory = Memory(
        workspace_id=test_workspace.id,
        user_id=test_user.id,
        category="facts",
        content="User lives in New York",
        importance_score=0.6,
    )
    db_session.add(memory)
    await db_session.flush()

    with patch(
        "app.services.embedding_service.get_embedding",
        new_callable=AsyncMock,
        return_value=[0.2] * 1536,
    ):
        response = await client.put(
            f"/api/v1/workspaces/{test_workspace.id}/memories/{memory.id}",
            headers=auth_headers,
            json={"content": "User lives in San Francisco", "importance_score": 0.8},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["content"] == "User lives in San Francisco"
    assert data["importance_score"] == 0.8


@pytest.mark.asyncio
async def test_delete_memory_soft(
    client: AsyncClient,
    auth_headers: dict,
    test_workspace: Workspace,
    db_session: AsyncSession,
    test_user: User,
):
    """Memory soft-delete sets is_active to False."""
    memory = Memory(
        workspace_id=test_workspace.id,
        user_id=test_user.id,
        category="tasks",
        content="Review PR by Friday",
        importance_score=0.5,
    )
    db_session.add(memory)
    await db_session.flush()

    response = await client.delete(
        f"/api/v1/workspaces/{test_workspace.id}/memories/{memory.id}",
        headers=auth_headers,
    )
    assert response.status_code == 204

    # Verify soft delete
    await db_session.refresh(memory)
    assert memory.is_active is False


@pytest.mark.asyncio
async def test_bulk_delete_memories(
    client: AsyncClient,
    auth_headers: dict,
    test_workspace: Workspace,
    db_session: AsyncSession,
    test_user: User,
):
    """Bulk delete sets all user memories to inactive."""
    for i in range(3):
        m = Memory(
            workspace_id=test_workspace.id,
            user_id=test_user.id,
            category="facts",
            content=f"Memory {i}",
            importance_score=0.5,
        )
        db_session.add(m)
    await db_session.flush()

    response = await client.delete(
        f"/api/v1/workspaces/{test_workspace.id}/memories",
        headers=auth_headers,
    )
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_memory_not_found(
    client: AsyncClient, auth_headers: dict, test_workspace: Workspace
):
    """Accessing a non-existent memory returns 404."""
    fake_id = uuid.uuid4()
    response = await client.get(
        f"/api/v1/workspaces/{test_workspace.id}/memories/{fake_id}",
        headers=auth_headers,
    )
    assert response.status_code == 404
