from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_min_role
from app.core.security import Role
from app.models.tool import McpTool, ToolLog
from app.models.user import User
from app.schemas.tool import (
    McpToolCreate,
    McpToolResponse,
    McpToolUpdate,
    ToolExecuteRequest,
    ToolExecuteResponse,
    ToolLogResponse,
)

router = APIRouter(prefix="/workspaces/{workspace_id}/tools", tags=["MCP Tools"])


@router.get("", response_model=list[McpToolResponse])
async def list_tools(
    workspace_id: uuid.UUID,
    active_only: bool = Query(True),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    membership=Depends(require_min_role(Role.MEMBER)),
):
    """List MCP tools for the workspace."""
    filters = [McpTool.workspace_id == workspace_id]
    if active_only:
        filters.append(McpTool.is_active == True)

    result = await db.execute(
        select(McpTool).where(and_(*filters)).order_by(McpTool.name)
    )
    return list(result.scalars().all())


@router.post("", response_model=McpToolResponse, status_code=status.HTTP_201_CREATED)
async def create_tool(
    workspace_id: uuid.UUID,
    payload: McpToolCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    membership=Depends(require_min_role(Role.ADMIN)),
):
    """Register a new MCP tool integration (admin+ only)."""
    # Check for duplicate name
    existing = await db.execute(
        select(McpTool).where(
            McpTool.workspace_id == workspace_id,
            McpTool.name == payload.name,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Tool with name '{payload.name}' already exists",
        )

    tool = McpTool(
        workspace_id=workspace_id,
        name=payload.name,
        description=payload.description,
        integration_type=payload.integration_type,
        config=payload.config,
        schema_=payload.schema_,
        requires_approval=payload.requires_approval,
    )
    db.add(tool)
    await db.flush()
    await db.refresh(tool)
    return tool


@router.get("/{tool_id}", response_model=McpToolResponse)
async def get_tool(
    workspace_id: uuid.UUID,
    tool_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    membership=Depends(require_min_role(Role.MEMBER)),
):
    """Get a specific tool."""
    result = await db.execute(
        select(McpTool).where(
            McpTool.id == tool_id,
            McpTool.workspace_id == workspace_id,
        )
    )
    tool = result.scalar_one_or_none()
    if not tool:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tool not found")
    return tool


@router.put("/{tool_id}", response_model=McpToolResponse)
async def update_tool(
    workspace_id: uuid.UUID,
    tool_id: uuid.UUID,
    payload: McpToolUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    membership=Depends(require_min_role(Role.ADMIN)),
):
    """Update a tool's configuration (admin+ only)."""
    result = await db.execute(
        select(McpTool).where(
            McpTool.id == tool_id,
            McpTool.workspace_id == workspace_id,
        )
    )
    tool = result.scalar_one_or_none()
    if not tool:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tool not found")

    if payload.name is not None:
        tool.name = payload.name
    if payload.description is not None:
        tool.description = payload.description
    if payload.config is not None:
        tool.config = {**tool.config, **payload.config}
    if payload.schema_ is not None:
        tool.schema_ = payload.schema_
    if payload.is_active is not None:
        tool.is_active = payload.is_active
    if payload.requires_approval is not None:
        tool.requires_approval = payload.requires_approval

    await db.flush()
    await db.refresh(tool)
    return tool


@router.delete("/{tool_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tool(
    workspace_id: uuid.UUID,
    tool_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    membership=Depends(require_min_role(Role.ADMIN)),
):
    """Delete a tool (admin+ only)."""
    result = await db.execute(
        select(McpTool).where(
            McpTool.id == tool_id,
            McpTool.workspace_id == workspace_id,
        )
    )
    tool = result.scalar_one_or_none()
    if not tool:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tool not found")

    await db.delete(tool)
    await db.flush()


@router.get("/{tool_id}/logs", response_model=list[ToolLogResponse])
async def get_tool_logs(
    workspace_id: uuid.UUID,
    tool_id: uuid.UUID,
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    membership=Depends(require_min_role(Role.MEMBER)),
):
    """Get execution logs for a specific tool."""
    # Verify tool belongs to workspace
    tool_result = await db.execute(
        select(McpTool).where(
            McpTool.id == tool_id,
            McpTool.workspace_id == workspace_id,
        )
    )
    if not tool_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tool not found")

    result = await db.execute(
        select(ToolLog)
        .where(ToolLog.tool_id == tool_id)
        .order_by(ToolLog.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())
