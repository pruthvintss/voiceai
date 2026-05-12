from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_min_role
from app.core.security import Role
from app.models.analytics import ConversationAnalytics
from app.models.conversation import Conversation
from app.models.user import User
from app.schemas.analytics import (
    ConversationAnalyticsResponse,
    WorkspaceAnalyticsSummary,
)
from app.services.analytics_service import get_workspace_analytics_summary

router = APIRouter(prefix="/workspaces/{workspace_id}/analytics", tags=["Analytics"])


@router.get("/summary", response_model=WorkspaceAnalyticsSummary)
async def get_workspace_summary(
    workspace_id: uuid.UUID,
    days: int = Query(30, ge=1, le=365, description="Number of days to look back"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    membership=Depends(require_min_role(Role.MEMBER)),
):
    """Get aggregated analytics summary for the workspace."""
    end_date = datetime.now(tz=timezone.utc)
    start_date = end_date - timedelta(days=days)

    data = await get_workspace_analytics_summary(
        db=db,
        workspace_id=workspace_id,
        start_date=start_date,
        end_date=end_date,
    )

    return WorkspaceAnalyticsSummary(
        workspace_id=workspace_id,
        period_start=start_date,
        period_end=end_date,
        total_conversations=data["total_conversations"],
        total_duration_seconds=data["total_duration_seconds"],
        avg_duration_seconds=data["avg_duration_seconds"],
        total_words_spoken=data["total_words_spoken"],
        total_tools_called=data["total_tools_called"],
        sentiment_breakdown={},
        top_topics=[],
        conversations_by_day=[],
        avg_latency_ms=data.get("avg_latency_ms"),
    )


@router.get("/conversations/{conversation_id}", response_model=ConversationAnalyticsResponse)
async def get_conversation_analytics(
    workspace_id: uuid.UUID,
    conversation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    membership=Depends(require_min_role(Role.MEMBER)),
):
    """Get analytics for a specific conversation."""
    # Verify conversation access
    conv_result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.workspace_id == workspace_id,
            Conversation.user_id == current_user.id,
        )
    )
    if not conv_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    result = await db.execute(
        select(ConversationAnalytics).where(
            ConversationAnalytics.conversation_id == conversation_id
        )
    )
    analytics = result.scalar_one_or_none()
    if not analytics:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analytics not yet generated for this conversation",
        )
    return analytics
