from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_min_role
from app.core.security import Role
from app.models.memory import Memory
from app.models.user import User
from app.schemas.memory import (
    MemoryCreate,
    MemoryListResponse,
    MemoryResponse,
    MemorySearchResponse,
    MemoryUpdate,
)
from app.services.memory_service import create_memory, search_memories

router = APIRouter(prefix="/workspaces/{workspace_id}/memories", tags=["Memory"])


@router.get("", response_model=MemoryListResponse)
async def list_memories(
    workspace_id: uuid.UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    membership=Depends(require_min_role(Role.MEMBER)),
):
    """List memories for the current user in the workspace."""
    filters = [
        Memory.workspace_id == workspace_id,
        Memory.user_id == current_user.id,
        Memory.is_active == True,
    ]
    if category:
        filters.append(Memory.category == category)

    count_result = await db.execute(
        select(func.count(Memory.id)).where(and_(*filters))
    )
    total = count_result.scalar() or 0

    offset = (page - 1) * page_size
    result = await db.execute(
        select(Memory)
        .where(and_(*filters))
        .order_by(Memory.importance_score.desc(), Memory.updated_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    memories = result.scalars().all()

    return MemoryListResponse(
        items=list(memories),
        total=total,
        page=page,
        page_size=page_size,
        has_next=(offset + page_size) < total,
    )


@router.get("/search", response_model=MemorySearchResponse)
async def search_memories_endpoint(
    workspace_id: uuid.UUID,
    q: str = Query(..., min_length=1, description="Search query"),
    category: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    membership=Depends(require_min_role(Role.MEMBER)),
):
    """Semantic search over user memories using pgvector."""
    results = await search_memories(
        db=db,
        workspace_id=workspace_id,
        user_id=current_user.id,
        query=q,
        category=category,
        limit=limit,
    )
    return MemorySearchResponse(items=results, query=q, total=len(results))


@router.post("", response_model=MemoryResponse, status_code=status.HTTP_201_CREATED)
async def create_memory_endpoint(
    workspace_id: uuid.UUID,
    payload: MemoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    membership=Depends(require_min_role(Role.MEMBER)),
):
    """Manually create a memory entry."""
    memory = await create_memory(
        db=db,
        workspace_id=workspace_id,
        user_id=current_user.id,
        data=payload,
    )
    return memory


@router.get("/{memory_id}", response_model=MemoryResponse)
async def get_memory(
    workspace_id: uuid.UUID,
    memory_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    membership=Depends(require_min_role(Role.MEMBER)),
):
    """Get a specific memory."""
    result = await db.execute(
        select(Memory).where(
            Memory.id == memory_id,
            Memory.workspace_id == workspace_id,
            Memory.user_id == current_user.id,
            Memory.is_active == True,
        )
    )
    memory = result.scalar_one_or_none()
    if not memory:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Memory not found")
    return memory


@router.put("/{memory_id}", response_model=MemoryResponse)
async def update_memory(
    workspace_id: uuid.UUID,
    memory_id: uuid.UUID,
    payload: MemoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    membership=Depends(require_min_role(Role.MEMBER)),
):
    """Update a memory's content or importance score."""
    from app.services.embedding_service import get_embedding

    result = await db.execute(
        select(Memory).where(
            Memory.id == memory_id,
            Memory.workspace_id == workspace_id,
            Memory.user_id == current_user.id,
            Memory.is_active == True,
        )
    )
    memory = result.scalar_one_or_none()
    if not memory:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Memory not found")

    if payload.category is not None:
        memory.category = payload.category
    if payload.importance_score is not None:
        memory.importance_score = payload.importance_score
    if payload.content is not None and payload.content != memory.content:
        memory.content = payload.content
        # Re-generate embedding for updated content
        memory.embedding = await get_embedding(payload.content)

    await db.flush()
    await db.refresh(memory)
    return memory


@router.delete("/{memory_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_memory(
    workspace_id: uuid.UUID,
    memory_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    membership=Depends(require_min_role(Role.MEMBER)),
):
    """Soft-delete a single memory."""
    result = await db.execute(
        select(Memory).where(
            Memory.id == memory_id,
            Memory.workspace_id == workspace_id,
            Memory.user_id == current_user.id,
        )
    )
    memory = result.scalar_one_or_none()
    if not memory:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Memory not found")

    memory.is_active = False
    await db.flush()


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def bulk_delete_memories(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    membership=Depends(require_min_role(Role.MEMBER)),
):
    """GDPR bulk delete: soft-delete ALL memories for the current user in this workspace."""
    await db.execute(
        update(Memory)
        .where(
            Memory.workspace_id == workspace_id,
            Memory.user_id == current_user.id,
        )
        .values(is_active=False)
    )
    await db.flush()
