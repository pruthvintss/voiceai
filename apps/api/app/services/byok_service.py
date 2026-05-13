from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

import httpx
import structlog
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import decrypt_api_key, encrypt_api_key, mask_api_key
from app.models.api_key import ApiKey
from app.schemas.api_key import ApiKeyCreate, ApiKeyValidateResponse

logger = structlog.get_logger(__name__)


async def get_active_api_key(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    provider: str,
    api_key_id: Optional[uuid.UUID] = None,
) -> Optional[str]:
    """
    Resolve the API key to use for a given provider.
    Priority: specified BYOK key > any active workspace BYOK key > platform default.
    """
    filters = [
        ApiKey.workspace_id == workspace_id,
        ApiKey.provider == provider,
        ApiKey.is_active == True,
    ]
    if api_key_id:
        filters.append(ApiKey.id == api_key_id)

    result = await db.execute(
        select(ApiKey)
        .where(*filters)
        .order_by(ApiKey.created_at.desc())
        .limit(1)
    )
    key_record = result.scalar_one_or_none()

    if key_record:
        try:
            plain_key = decrypt_api_key(key_record.encrypted_key)
            # Update usage tracking asynchronously
            await db.execute(
                update(ApiKey)
                .where(ApiKey.id == key_record.id)
                .values(
                    usage_count=ApiKey.usage_count + 1,
                    last_used_at=datetime.now(tz=timezone.utc),
                )
            )
            await db.flush()
            return plain_key
        except Exception as exc:
            logger.error("Failed to decrypt API key", key_id=str(key_record.id), error=str(exc))

    # Fall back to platform default
    if provider == "openai":
        return settings.OPENAI_DEFAULT_API_KEY
    if provider == "azure_openai":
        return settings.AZURE_OPENAI_DEFAULT_API_KEY
    if provider == "gemini":
        return settings.GOOGLE_DEFAULT_API_KEY
    if provider == "anthropic":
        return settings.ANTHROPIC_API_KEY

    return None


async def create_api_key(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    data: ApiKeyCreate,
) -> ApiKey:
    encrypted = encrypt_api_key(data.key)
    preview = mask_api_key(data.key)

    key = ApiKey(
        workspace_id=workspace_id,
        user_id=user_id,
        name=data.name,
        provider=data.provider,
        encrypted_key=encrypted,
        key_preview=preview,
    )
    db.add(key)
    await db.flush()
    await db.refresh(key)
    return key


async def validate_api_key(
    provider: str, plain_key: str, azure_endpoint: str = ""
) -> ApiKeyValidateResponse:
    """Test whether an API key is valid by making a minimal API call."""
    try:
        if provider == "openai":
            return await _validate_openai_key(plain_key)
        elif provider == "azure_openai":
            return await _validate_azure_openai_key(plain_key, azure_endpoint)
        elif provider == "gemini":
            return await _validate_gemini_key(plain_key)
        else:
            return ApiKeyValidateResponse(
                valid=False,
                provider=provider,
                error=f"Unknown provider: {provider}",
            )
    except Exception as exc:
        return ApiKeyValidateResponse(valid=False, provider=provider, error=str(exc))


async def _validate_openai_key(key: str) -> ApiKeyValidateResponse:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://api.openai.com/v1/models",
            headers={"Authorization": f"Bearer {key}"},
            timeout=10.0,
        )
    if resp.status_code == 200:
        models = [m["id"] for m in resp.json().get("data", [])]
        return ApiKeyValidateResponse(valid=True, provider="openai", model_list=models[:20])
    else:
        error = resp.json().get("error", {}).get("message", "Invalid key")
        return ApiKeyValidateResponse(valid=False, provider="openai", error=error)


async def _validate_azure_openai_key(key: str, endpoint: str) -> ApiKeyValidateResponse:
    if not endpoint:
        return ApiKeyValidateResponse(
            valid=False, provider="azure_openai", error="azure_endpoint is required"
        )
    endpoint = endpoint.rstrip("/")
    url = f"{endpoint}/openai/deployments?api-version=2024-02-01"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers={"api-key": key}, timeout=10.0)
    if resp.status_code == 200:
        deployments = [d["id"] for d in resp.json().get("data", [])]
        return ApiKeyValidateResponse(
            valid=True, provider="azure_openai", model_list=deployments[:20]
        )
    else:
        error = resp.json().get("error", {}).get("message", "Invalid key or endpoint")
        return ApiKeyValidateResponse(valid=False, provider="azure_openai", error=error)


async def _validate_gemini_key(key: str) -> ApiKeyValidateResponse:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"https://generativelanguage.googleapis.com/v1beta/models?key={key}",
            timeout=10.0,
        )
    if resp.status_code == 200:
        models = [m["name"] for m in resp.json().get("models", [])]
        return ApiKeyValidateResponse(valid=True, provider="gemini", model_list=models[:20])
    else:
        error = resp.json().get("error", {}).get("message", "Invalid key")
        return ApiKeyValidateResponse(valid=False, provider="gemini", error=error)
