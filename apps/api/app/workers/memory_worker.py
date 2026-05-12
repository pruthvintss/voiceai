from __future__ import annotations

import asyncio
import uuid
from typing import Optional

import structlog

from app.workers.celery_app import celery_app

logger = structlog.get_logger(__name__)


@celery_app.task(
    name="app.workers.memory_worker.generate_missing_embeddings",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def generate_missing_embeddings(self, workspace_id: Optional[str] = None) -> dict:
    """
    Find memories without embeddings and generate them in bulk.
    Can be scoped to a specific workspace or run globally.
    """
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(
            _generate_missing_embeddings_async(
                workspace_id=uuid.UUID(workspace_id) if workspace_id else None
            )
        )
        loop.close()
        return result
    except Exception as exc:
        logger.error("Embedding generation worker failed", error=str(exc))
        raise self.retry(exc=exc)


async def _generate_missing_embeddings_async(
    workspace_id: Optional[uuid.UUID] = None,
) -> dict:
    from sqlalchemy import and_, select, update

    from app.core.database import get_db_context
    from app.models.memory import Memory
    from app.services.embedding_service import get_embeddings_batch

    async with get_db_context() as db:
        filters = [Memory.embedding.is_(None), Memory.is_active == True]
        if workspace_id:
            filters.append(Memory.workspace_id == workspace_id)

        result = await db.execute(
            select(Memory).where(and_(*filters)).limit(100)
        )
        memories = result.scalars().all()

        if not memories:
            return {"processed": 0}

        texts = [m.content for m in memories]
        embeddings = await get_embeddings_batch(texts)

        for memory, embedding in zip(memories, embeddings):
            await db.execute(
                update(Memory)
                .where(Memory.id == memory.id)
                .values(embedding=embedding)
            )

        await db.commit()
        logger.info("Embeddings generated", count=len(memories))
        return {"processed": len(memories)}


@celery_app.task(
    name="app.workers.memory_worker.deduplicate_memories",
    bind=True,
    max_retries=2,
    default_retry_delay=120,
)
def deduplicate_memories(self, workspace_id: str, user_id: str) -> dict:
    """
    Find and merge near-duplicate memories for a user.
    Runs periodically to keep the memory store clean.
    """
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(
            _deduplicate_memories_async(
                workspace_id=uuid.UUID(workspace_id),
                user_id=uuid.UUID(user_id),
            )
        )
        loop.close()
        return result
    except Exception as exc:
        logger.error("Memory deduplication failed", error=str(exc))
        raise self.retry(exc=exc)


async def _deduplicate_memories_async(
    workspace_id: uuid.UUID, user_id: uuid.UUID
) -> dict:
    """
    Find memories with very high similarity (> 0.95) and deactivate duplicates.
    """
    from sqlalchemy import and_, select, text, update

    from app.core.database import get_db_context
    from app.models.memory import Memory

    deactivated = 0

    async with get_db_context() as db:
        # Get all active memories with embeddings for this user
        result = await db.execute(
            select(Memory).where(
                and_(
                    Memory.workspace_id == workspace_id,
                    Memory.user_id == user_id,
                    Memory.is_active == True,
                    Memory.embedding.is_not(None),
                )
            ).order_by(Memory.importance_score.desc())
        )
        memories = result.scalars().all()

        processed_ids = set()
        for i, mem in enumerate(memories):
            if mem.id in processed_ids:
                continue

            # Find near-duplicates
            dup_result = await db.execute(
                text(
                    """
                    SELECT id FROM memories
                    WHERE workspace_id = :workspace_id
                      AND user_id = :user_id
                      AND is_active = true
                      AND id != :current_id
                      AND embedding IS NOT NULL
                      AND 1 - (embedding <=> CAST(:embedding AS vector)) > 0.95
                    """
                ),
                {
                    "workspace_id": str(workspace_id),
                    "user_id": str(user_id),
                    "current_id": str(mem.id),
                    "embedding": str(mem.embedding),
                },
            )
            dup_rows = dup_result.fetchall()

            for row in dup_rows:
                dup_id = uuid.UUID(str(row[0]))
                if dup_id not in processed_ids:
                    await db.execute(
                        update(Memory)
                        .where(Memory.id == dup_id)
                        .values(is_active=False)
                    )
                    processed_ids.add(dup_id)
                    deactivated += 1

            processed_ids.add(mem.id)

        await db.commit()

    logger.info(
        "Memory deduplication complete",
        workspace_id=str(workspace_id),
        user_id=str(user_id),
        deactivated=deactivated,
    )
    return {"deactivated": deactivated}
