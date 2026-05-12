from __future__ import annotations

import uuid
from typing import Optional

import structlog
import tiktoken
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.conversation import Conversation
from app.models.memory import Memory
from app.models.summary import CallSummary
from app.schemas.session import ContextBundle
from app.services.memory_service import get_memories_for_context

logger = structlog.get_logger(__name__)

_tokenizer = tiktoken.get_encoding("cl100k_base")


def _count_tokens(text: str) -> int:
    return len(_tokenizer.encode(text))


def _truncate_to_tokens(text: str, max_tokens: int) -> str:
    tokens = _tokenizer.encode(text)
    if len(tokens) <= max_tokens:
        return text
    return _tokenizer.decode(tokens[:max_tokens])


async def build_context(
    db: AsyncSession,
    user_id: uuid.UUID,
    workspace_id: uuid.UUID,
    conversation_history_limit: int = 5,
    query: Optional[str] = None,
) -> ContextBundle:
    """
    Assemble a ContextBundle for pre-call context injection.

    Steps:
    1. Recent conversation summaries
    2. High-importance memories (preferences, facts)
    3. Active tasks from memories
    4. User preferences from memories
    5. Compress everything to fit MAX_CONTEXT_TOKENS
    """
    budget = settings.MAX_CONTEXT_TOKENS
    token_usage = 0

    # -----------------------------------------------------------------------
    # 1. Recent call summaries
    # -----------------------------------------------------------------------
    recent_summary_text = ""
    recent_convs_result = await db.execute(
        select(Conversation)
        .where(
            and_(
                Conversation.workspace_id == workspace_id,
                Conversation.user_id == user_id,
                Conversation.status == "completed",
            )
        )
        .order_by(Conversation.ended_at.desc())
        .limit(conversation_history_limit)
    )
    recent_convs = recent_convs_result.scalars().all()

    if recent_convs:
        summary_lines = []
        for conv in recent_convs:
            summary_result = await db.execute(
                select(CallSummary).where(CallSummary.conversation_id == conv.id)
            )
            summary = summary_result.scalar_one_or_none()
            if summary:
                date_str = conv.started_at.strftime("%Y-%m-%d %H:%M")
                summary_lines.append(f"[{date_str}] {summary.summary}")
                if summary.next_call_context:
                    summary_lines.append(f"  Context for next call: {summary.next_call_context}")

        if summary_lines:
            recent_summary_text = "\n".join(summary_lines)
            tokens = _count_tokens(recent_summary_text)
            token_usage += tokens
            budget -= tokens

    # -----------------------------------------------------------------------
    # 2. User preferences
    # -----------------------------------------------------------------------
    preferences_text = ""
    if budget > 200:
        prefs = await get_memories_for_context(
            db=db,
            workspace_id=workspace_id,
            user_id=user_id,
            category="preferences",
            limit=10,
        )
        if prefs:
            pref_lines = [f"- {m.content}" for m in prefs]
            preferences_text = "\n".join(pref_lines)
            preferences_text = _truncate_to_tokens(preferences_text, min(budget // 4, 800))
            tokens = _count_tokens(preferences_text)
            token_usage += tokens
            budget -= tokens

    # -----------------------------------------------------------------------
    # 3. Active tasks
    # -----------------------------------------------------------------------
    tasks_text = ""
    if budget > 200:
        tasks = await get_memories_for_context(
            db=db,
            workspace_id=workspace_id,
            user_id=user_id,
            category="tasks",
            limit=10,
        )
        if tasks:
            task_lines = [f"- {m.content}" for m in tasks]
            tasks_text = "\n".join(task_lines)
            tasks_text = _truncate_to_tokens(tasks_text, min(budget // 4, 800))
            tokens = _count_tokens(tasks_text)
            token_usage += tokens
            budget -= tokens

    # -----------------------------------------------------------------------
    # 4. General memory retrieval (facts, relationships, business, issues)
    # -----------------------------------------------------------------------
    retrieved_memory_text = ""
    if budget > 500:
        important_memories_result = await db.execute(
            select(Memory)
            .where(
                and_(
                    Memory.workspace_id == workspace_id,
                    Memory.user_id == user_id,
                    Memory.is_active == True,
                    Memory.category.in_(["facts", "relationships", "business", "issues", "patterns"]),
                )
            )
            .order_by(Memory.importance_score.desc())
            .limit(settings.MEMORY_TOP_K)
        )
        memories = important_memories_result.scalars().all()

        if memories:
            by_category: dict[str, list[str]] = {}
            for m in memories:
                by_category.setdefault(m.category, []).append(m.content)

            lines = []
            for cat, items in by_category.items():
                lines.append(f"### {cat.title()}")
                lines.extend(f"- {item}" for item in items)
            retrieved_memory_text = "\n".join(lines)
            retrieved_memory_text = _truncate_to_tokens(retrieved_memory_text, min(budget, 2000))
            tokens = _count_tokens(retrieved_memory_text)
            token_usage += tokens
            budget -= tokens

    # -----------------------------------------------------------------------
    # 5. Application context (static platform intro)
    # -----------------------------------------------------------------------
    app_context = (
        "You are a helpful, intelligent voice AI assistant. "
        "Use the context below to provide personalized, contextually aware responses. "
        "You have access to the user's history and memories to deliver a seamless experience."
    )

    return ContextBundle(
        application_context=app_context,
        retrieved_memory=retrieved_memory_text,
        recent_call_summary=recent_summary_text,
        retrieved_documents="",
        user_preferences=preferences_text,
        active_tasks=tasks_text,
        total_tokens=token_usage,
    )
