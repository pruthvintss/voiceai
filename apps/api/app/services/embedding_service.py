from __future__ import annotations

import structlog
from openai import AsyncOpenAI

from app.core.config import settings

logger = structlog.get_logger(__name__)

_openai_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    global _openai_client
    if _openai_client is None:
        if not settings.OPENAI_DEFAULT_API_KEY:
            raise RuntimeError("OPENAI_DEFAULT_API_KEY is required for embeddings")
        _openai_client = AsyncOpenAI(api_key=settings.OPENAI_DEFAULT_API_KEY)
    return _openai_client


async def get_embedding(text: str) -> list[float]:
    """Generate a single text embedding vector."""
    client = _get_client()
    text = text.replace("\n", " ").strip()
    if not text:
        return [0.0] * settings.EMBEDDING_DIMENSIONS

    try:
        response = await client.embeddings.create(
            input=text,
            model=settings.EMBEDDING_MODEL,
            dimensions=settings.EMBEDDING_DIMENSIONS,
        )
        return response.data[0].embedding
    except Exception as exc:
        logger.error("Embedding generation failed", error=str(exc), text_preview=text[:100])
        raise


async def get_embeddings_batch(texts: list[str]) -> list[list[float]]:
    """Generate embeddings for a batch of texts."""
    if not texts:
        return []

    client = _get_client()
    cleaned = [t.replace("\n", " ").strip() or " " for t in texts]

    try:
        response = await client.embeddings.create(
            input=cleaned,
            model=settings.EMBEDDING_MODEL,
            dimensions=settings.EMBEDDING_DIMENSIONS,
        )
        # OpenAI returns in the same order as input
        return [item.embedding for item in sorted(response.data, key=lambda x: x.index)]
    except Exception as exc:
        logger.error("Batch embedding generation failed", error=str(exc), count=len(texts))
        raise
