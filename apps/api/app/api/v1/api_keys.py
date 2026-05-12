from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_min_role
from app.core.security import Role, decrypt_api_key
from app.models.api_key import ApiKey
from app.models.user import User
from app.schemas.api_key import (
    ApiKeyCreate,
    ApiKeyResponse,
    ApiKeyUpdate,
    ApiKeyValidateResponse,
)
from app.services.byok_service import create_api_key, validate_api_key

router = APIRouter(prefix="/workspaces/{workspace_id}/api-keys", tags=["API Keys"])


@router.get("", response_model=list[ApiKeyResponse])
async def list_api_keys(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    membership=Depends(require_min_role(Role.MEMBER)),
):
    """List all API keys for the workspace (keys are masked)."""
    result = await db.execute(
        select(ApiKey)
        .where(ApiKey.workspace_id == workspace_id)
        .order_by(ApiKey.created_at.desc())
    )
    return list(result.scalars().all())


@router.post("", response_model=ApiKeyResponse, status_code=status.HTTP_201_CREATED)
async def add_api_key(
    workspace_id: uuid.UUID,
    payload: ApiKeyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    membership=Depends(require_min_role(Role.MEMBER)),
):
    """Add a new BYOK API key (encrypted at rest)."""
    key = await create_api_key(
        db=db,
        workspace_id=workspace_id,
        user_id=current_user.id,
        data=payload,
    )
    return key


@router.put("/{key_id}", response_model=ApiKeyResponse)
async def update_api_key(
    workspace_id: uuid.UUID,
    key_id: uuid.UUID,
    payload: ApiKeyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    membership=Depends(require_min_role(Role.MEMBER)),
):
    """Update an API key name or active status."""
    result = await db.execute(
        select(ApiKey).where(
            ApiKey.id == key_id,
            ApiKey.workspace_id == workspace_id,
        )
    )
    key = result.scalar_one_or_none()
    if not key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API key not found")

    # Only the owner of the key or an admin can update
    if key.user_id != current_user.id and membership.role not in (Role.ADMIN, Role.OWNER):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    if payload.name is not None:
        key.name = payload.name
    if payload.is_active is not None:
        key.is_active = payload.is_active

    await db.flush()
    await db.refresh(key)
    return key


@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_api_key(
    workspace_id: uuid.UUID,
    key_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    membership=Depends(require_min_role(Role.MEMBER)),
):
    """Delete an API key."""
    result = await db.execute(
        select(ApiKey).where(
            ApiKey.id == key_id,
            ApiKey.workspace_id == workspace_id,
        )
    )
    key = result.scalar_one_or_none()
    if not key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API key not found")

    if key.user_id != current_user.id and membership.role not in (Role.ADMIN, Role.OWNER):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    await db.delete(key)
    await db.flush()


@router.post("/{key_id}/validate", response_model=ApiKeyValidateResponse)
async def validate_api_key_endpoint(
    workspace_id: uuid.UUID,
    key_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    membership=Depends(require_min_role(Role.MEMBER)),
):
    """Test whether a stored API key is valid."""
    result = await db.execute(
        select(ApiKey).where(
            ApiKey.id == key_id,
            ApiKey.workspace_id == workspace_id,
        )
    )
    key = result.scalar_one_or_none()
    if not key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API key not found")

    try:
        plain_key = decrypt_api_key(key.encrypted_key)
    except ValueError:
        return ApiKeyValidateResponse(
            valid=False, provider=key.provider, error="Failed to decrypt key"
        )

    return await validate_api_key(provider=key.provider, plain_key=plain_key)
