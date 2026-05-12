from __future__ import annotations

import json
from typing import Any, Optional

import redis.asyncio as aioredis
import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)

_redis_pool: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    """Return a Redis client backed by a connection pool."""
    global _redis_pool
    if _redis_pool is None:
        _redis_pool = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            max_connections=50,
            socket_keepalive=True,
            health_check_interval=30,
        )
    return _redis_pool


async def close_redis() -> None:
    global _redis_pool
    if _redis_pool is not None:
        await _redis_pool.aclose()
        _redis_pool = None


async def check_redis_connection() -> bool:
    """Health check: ping Redis."""
    try:
        client = await get_redis()
        await client.ping()
        return True
    except Exception as exc:
        logger.error("Redis health check failed", error=str(exc))
        return False


# -----------------------------------------------------------------------
# Helper wrappers for JSON-serialised values
# -----------------------------------------------------------------------

async def redis_set_json(key: str, value: Any, expire: Optional[int] = None) -> None:
    client = await get_redis()
    serialised = json.dumps(value)
    if expire:
        await client.setex(key, expire, serialised)
    else:
        await client.set(key, serialised)


async def redis_get_json(key: str) -> Optional[Any]:
    client = await get_redis()
    raw = await client.get(key)
    if raw is None:
        return None
    return json.loads(raw)


async def redis_delete(key: str) -> None:
    client = await get_redis()
    await client.delete(key)


async def redis_publish(channel: str, message: Any) -> None:
    client = await get_redis()
    await client.publish(channel, json.dumps(message))


async def redis_subscribe(channel: str):
    """Return an async pubsub subscriber for the given channel."""
    client = await get_redis()
    pubsub = client.pubsub()
    await pubsub.subscribe(channel)
    return pubsub
