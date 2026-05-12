from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.memory import Memory
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.session import ContextBundle
from app.services.context_service import build_context


@pytest.mark.asyncio
async def test_build_context_empty(
    db_session: AsyncSession,
    test_user: User,
    test_workspace: Workspace,
):
    """Context build succeeds for user with no history or memories."""
    context = await build_context(
        db=db_session,
        user_id=test_user.id,
        workspace_id=test_workspace.id,
    )
    assert isinstance(context, ContextBundle)
    assert context.application_context != ""
    assert context.retrieved_memory == ""
    assert context.recent_call_summary == ""


@pytest.mark.asyncio
async def test_build_context_with_memories(
    db_session: AsyncSession,
    test_user: User,
    test_workspace: Workspace,
):
    """Context includes user memories when they exist."""
    for i, category in enumerate(["preferences", "facts", "tasks"]):
        memory = Memory(
            workspace_id=test_workspace.id,
            user_id=test_user.id,
            category=category,
            content=f"Test memory for {category}",
            importance_score=0.8,
            embedding=[0.1] * 1536,
        )
        db_session.add(memory)
    await db_session.flush()

    context = await build_context(
        db=db_session,
        user_id=test_user.id,
        workspace_id=test_workspace.id,
    )

    assert context.user_preferences != ""  # preferences memory
    assert context.active_tasks != ""  # tasks memory
    assert "Test memory for preferences" in context.user_preferences
    assert "Test memory for tasks" in context.active_tasks


@pytest.mark.asyncio
async def test_context_system_prompt_block():
    """ContextBundle formats into a usable system prompt block."""
    bundle = ContextBundle(
        application_context="You are a helpful assistant.",
        retrieved_memory="- User is a software engineer",
        user_preferences="- Prefers concise answers",
        active_tasks="- Review PR by Friday",
        recent_call_summary="Discussed project timeline",
        retrieved_documents="",
        total_tokens=200,
    )
    prompt = bundle.to_system_prompt_block()
    assert "Application Context" in prompt
    assert "User Preferences" in prompt
    assert "Active Tasks" in prompt
    assert "Relevant Memories" in prompt
    assert "Recent Call Summary" in prompt
    assert "Relevant Documents" not in prompt  # Empty, should be excluded


@pytest.mark.asyncio
async def test_context_token_budget_enforced(
    db_session: AsyncSession,
    test_user: User,
    test_workspace: Workspace,
):
    """Context respects MAX_CONTEXT_TOKENS budget."""
    # Add many high-importance memories
    for i in range(50):
        memory = Memory(
            workspace_id=test_workspace.id,
            user_id=test_user.id,
            category="facts",
            content="X" * 500,  # Large content
            importance_score=0.9,
            embedding=[0.1] * 1536,
        )
        db_session.add(memory)
    await db_session.flush()

    context = await build_context(
        db=db_session,
        user_id=test_user.id,
        workspace_id=test_workspace.id,
    )

    # Total tokens should not vastly exceed the budget
    assert context.total_tokens <= 10000  # Some slack allowed
