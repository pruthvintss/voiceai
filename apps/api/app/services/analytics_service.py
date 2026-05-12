from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

import structlog
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analytics import ConversationAnalytics
from app.models.conversation import Conversation, Transcript
from app.models.memory import Memory

logger = structlog.get_logger(__name__)


async def compute_and_save_analytics(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    transcript_turns: list[dict[str, Any]],
    latency_samples: list[float] | None = None,
) -> ConversationAnalytics:
    """Compute analytics from a completed conversation and persist them."""
    user_turns = [t for t in transcript_turns if t.get("role") == "user"]
    agent_turns = [t for t in transcript_turns if t.get("role") == "assistant"]
    interruptions = sum(1 for t in transcript_turns if t.get("is_interrupted", False))

    words_user = sum(len(t.get("content", "").split()) for t in user_turns)
    words_agent = sum(len(t.get("content", "").split()) for t in agent_turns)

    avg_latency: float | None = None
    if latency_samples:
        avg_latency = sum(latency_samples) / len(latency_samples)

    # Simple topic extraction from agent turns (top words excluding stop words)
    stop_words = {
        "the", "a", "an", "is", "are", "was", "were", "be", "been",
        "being", "have", "has", "had", "do", "does", "did", "will",
        "would", "could", "should", "may", "might", "can", "i", "you",
        "he", "she", "it", "we", "they", "what", "which", "who", "this",
        "that", "and", "or", "but", "in", "on", "at", "to", "for", "of",
        "with", "by", "from", "up", "about", "into", "through", "during",
    }
    word_freq: dict[str, int] = {}
    for turn in transcript_turns:
        for word in turn.get("content", "").lower().split():
            word = word.strip(".,!?;:")
            if len(word) > 4 and word not in stop_words:
                word_freq[word] = word_freq.get(word, 0) + 1

    topics = sorted(word_freq, key=word_freq.get, reverse=True)[:10]  # type: ignore[arg-type]

    # Build simple sentiment timeline per agent turn
    sentiment_timeline = []
    for i, turn in enumerate(agent_turns[:20]):  # sample first 20 agent turns
        # Simple heuristic: count positive/negative words
        content = turn.get("content", "").lower()
        positive_words = {"great", "excellent", "good", "happy", "sure", "absolutely", "perfect"}
        negative_words = {"sorry", "unfortunately", "problem", "issue", "error", "fail", "can't"}
        pos = sum(1 for w in positive_words if w in content)
        neg = sum(1 for w in negative_words if w in content)
        if pos > neg:
            sentiment = "positive"
        elif neg > pos:
            sentiment = "negative"
        else:
            sentiment = "neutral"
        sentiment_timeline.append({"turn": i, "sentiment": sentiment})

    # Check if analytics already exist
    existing_result = await db.execute(
        select(ConversationAnalytics).where(
            ConversationAnalytics.conversation_id == conversation_id
        )
    )
    existing = existing_result.scalar_one_or_none()

    if existing:
        existing.total_turns = len(transcript_turns)
        existing.user_turns = len(user_turns)
        existing.agent_turns = len(agent_turns)
        existing.avg_response_latency_ms = avg_latency
        existing.interruption_count = interruptions
        existing.words_spoken_user = words_user
        existing.words_spoken_agent = words_agent
        existing.topics = topics
        existing.sentiment_timeline = sentiment_timeline
        existing.latency_samples = latency_samples or []
        existing.updated_at = datetime.now(tz=timezone.utc)
        await db.flush()
        return existing

    analytics = ConversationAnalytics(
        conversation_id=conversation_id,
        total_turns=len(transcript_turns),
        user_turns=len(user_turns),
        agent_turns=len(agent_turns),
        avg_response_latency_ms=avg_latency,
        interruption_count=interruptions,
        words_spoken_user=words_user,
        words_spoken_agent=words_agent,
        topics=topics,
        sentiment_timeline=sentiment_timeline,
        latency_samples=latency_samples or [],
    )
    db.add(analytics)
    await db.flush()
    await db.refresh(analytics)
    return analytics


async def get_workspace_analytics_summary(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    start_date: datetime,
    end_date: datetime,
) -> dict[str, Any]:
    """Aggregate workspace-level analytics for a date range."""
    # Total conversations
    conv_result = await db.execute(
        select(func.count(Conversation.id)).where(
            and_(
                Conversation.workspace_id == workspace_id,
                Conversation.started_at >= start_date,
                Conversation.started_at <= end_date,
                Conversation.status == "completed",
            )
        )
    )
    total_conversations = conv_result.scalar() or 0

    # Duration stats
    duration_result = await db.execute(
        select(
            func.sum(Conversation.duration_seconds),
            func.avg(Conversation.duration_seconds),
        ).where(
            and_(
                Conversation.workspace_id == workspace_id,
                Conversation.started_at >= start_date,
                Conversation.started_at <= end_date,
                Conversation.status == "completed",
                Conversation.duration_seconds.is_not(None),
            )
        )
    )
    dur_row = duration_result.fetchone()
    total_duration = float(dur_row[0] or 0)
    avg_duration = float(dur_row[1] or 0)

    # Analytics aggregates
    agg_result = await db.execute(
        select(
            func.sum(ConversationAnalytics.words_spoken_user + ConversationAnalytics.words_spoken_agent),
            func.sum(ConversationAnalytics.tools_called),
            func.avg(ConversationAnalytics.avg_response_latency_ms),
        )
        .join(Conversation, ConversationAnalytics.conversation_id == Conversation.id)
        .where(
            and_(
                Conversation.workspace_id == workspace_id,
                Conversation.started_at >= start_date,
                Conversation.started_at <= end_date,
            )
        )
    )
    agg_row = agg_result.fetchone()
    total_words = int(agg_row[0] or 0)
    total_tools = int(agg_row[1] or 0)
    avg_latency = float(agg_row[2]) if agg_row[2] else None

    return {
        "workspace_id": workspace_id,
        "period_start": start_date,
        "period_end": end_date,
        "total_conversations": total_conversations,
        "total_duration_seconds": total_duration,
        "avg_duration_seconds": avg_duration,
        "total_words_spoken": total_words,
        "total_tools_called": total_tools,
        "avg_latency_ms": avg_latency,
    }
