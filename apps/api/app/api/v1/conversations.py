from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_min_role
from app.core.security import Role
from app.models.conversation import Conversation, Transcript
from app.models.memory import Memory
from app.models.summary import CallSummary
from app.models.user import User
from app.schemas.conversation import (
    ConversationDetailResponse,
    ConversationListResponse,
    ConversationResponse,
    TranscriptSchema,
    TranscriptTurnSchema,
)
from app.schemas.memory import MemoryResponse

router = APIRouter(prefix="/workspaces/{workspace_id}/conversations", tags=["Conversations"])


@router.get("", response_model=ConversationListResponse)
async def list_conversations(
    workspace_id: uuid.UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    membership=Depends(require_min_role(Role.MEMBER)),
):
    """List conversations for the workspace with pagination."""
    filters = [
        Conversation.workspace_id == workspace_id,
        Conversation.user_id == current_user.id,
    ]
    if status_filter:
        filters.append(Conversation.status == status_filter)

    # Count query
    count_result = await db.execute(
        select(func.count(Conversation.id)).where(and_(*filters))
    )
    total = count_result.scalar() or 0

    # Paginated query
    offset = (page - 1) * page_size
    result = await db.execute(
        select(Conversation)
        .where(and_(*filters))
        .order_by(Conversation.started_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    conversations = result.scalars().all()

    return ConversationListResponse(
        items=list(conversations),
        total=total,
        page=page,
        page_size=page_size,
        has_next=(offset + page_size) < total,
    )


@router.get("/{conversation_id}", response_model=ConversationDetailResponse)
async def get_conversation(
    workspace_id: uuid.UUID,
    conversation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    membership=Depends(require_min_role(Role.MEMBER)),
):
    """Get a conversation with its full transcript."""
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.transcript))
        .where(
            and_(
                Conversation.id == conversation_id,
                Conversation.workspace_id == workspace_id,
                Conversation.user_id == current_user.id,
            )
        )
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    return conversation


@router.get("/{conversation_id}/summary")
async def get_conversation_summary(
    workspace_id: uuid.UUID,
    conversation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    membership=Depends(require_min_role(Role.MEMBER)),
):
    """Get the post-call summary for a conversation."""
    # Verify ownership
    conv_result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.workspace_id == workspace_id,
            Conversation.user_id == current_user.id,
        )
    )
    if not conv_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    summary_result = await db.execute(
        select(CallSummary).where(CallSummary.conversation_id == conversation_id)
    )
    summary = summary_result.scalar_one_or_none()
    if not summary:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Summary not yet available")

    return {
        "id": summary.id,
        "conversation_id": summary.conversation_id,
        "summary": summary.summary,
        "action_items": summary.action_items,
        "open_loops": summary.open_loops,
        "entities": summary.entities,
        "sentiment": summary.sentiment,
        "priority": summary.priority,
        "next_call_context": summary.next_call_context,
        "topics": summary.topics,
        "created_at": summary.created_at,
    }


@router.get("/{conversation_id}/memories", response_model=list[MemoryResponse])
async def get_conversation_memories(
    workspace_id: uuid.UUID,
    conversation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    membership=Depends(require_min_role(Role.MEMBER)),
):
    """Get memories extracted from a conversation."""
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
        select(Memory)
        .where(
            Memory.source_conversation_id == conversation_id,
            Memory.is_active == True,
        )
        .order_by(Memory.importance_score.desc())
    )
    return list(result.scalars().all())


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    workspace_id: uuid.UUID,
    conversation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    membership=Depends(require_min_role(Role.MEMBER)),
):
    """Delete a conversation and all associated data."""
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.workspace_id == workspace_id,
            Conversation.user_id == current_user.id,
        )
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    await db.delete(conversation)
    await db.flush()
