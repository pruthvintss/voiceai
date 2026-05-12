from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

import structlog
from celery import shared_task

from app.workers.celery_app import celery_app

logger = structlog.get_logger(__name__)


@celery_app.task(
    name="app.workers.post_call_worker.process_post_call",
    bind=True,
    max_retries=3,
    default_retry_delay=30,
)
def process_post_call(
    self,
    conversation_id: str,
    user_id: Optional[str],
    workspace_id: Optional[str],
    transcript_turns: list[dict[str, Any]],
    latency_samples: list[float],
    duration_seconds: float,
) -> dict[str, Any]:
    """
    Celery task for post-call processing:
    1. Save final transcript
    2. Update conversation status and duration
    3. Generate call summary
    4. Extract and save memories
    5. Compute analytics
    """
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(
            _run_post_call_sync(
                db=None,  # Will create internally
                conversation_id=uuid.UUID(conversation_id),
                user_id=uuid.UUID(user_id) if user_id else None,
                workspace_id=uuid.UUID(workspace_id) if workspace_id else None,
                transcript_turns=transcript_turns,
                latency_samples=latency_samples,
                duration_seconds=duration_seconds,
            )
        )
        loop.close()
        return result
    except Exception as exc:
        logger.error("Post-call worker failed", error=str(exc), conversation_id=conversation_id)
        raise self.retry(exc=exc)


async def _run_post_call_sync(
    db,  # AsyncSession or None
    conversation_id: uuid.UUID,
    user_id: Optional[uuid.UUID],
    workspace_id: Optional[uuid.UUID],
    transcript_turns: list[dict[str, Any]],
    latency_samples: list[float],
    duration_seconds: float,
) -> dict[str, Any]:
    """Core async post-call logic (can be called directly or via Celery)."""
    from app.core.database import get_db_context
    from app.models.conversation import Conversation, Transcript
    from app.models.summary import CallSummary
    from app.services.analytics_service import compute_and_save_analytics
    from app.services.memory_service import extract_memories_from_transcript
    from app.services.summarization_service import generate_call_summary
    from sqlalchemy import select, update

    logger.info(
        "Starting post-call processing",
        conversation_id=str(conversation_id),
        turns=len(transcript_turns),
        duration=duration_seconds,
    )

    async with get_db_context() as session:
        # ------------------------------------------------------------------
        # 1. Update conversation status and duration
        # ------------------------------------------------------------------
        await session.execute(
            update(Conversation)
            .where(Conversation.id == conversation_id)
            .values(
                status="completed",
                ended_at=datetime.now(tz=timezone.utc),
                duration_seconds=duration_seconds,
            )
        )
        await session.flush()

        # ------------------------------------------------------------------
        # 2. Save full transcript
        # ------------------------------------------------------------------
        transcript_result = await session.execute(
            select(Transcript).where(Transcript.conversation_id == conversation_id)
        )
        transcript = transcript_result.scalar_one_or_none()
        if transcript:
            transcript.turns = transcript_turns
            transcript.updated_at = datetime.now(tz=timezone.utc)
        else:
            transcript = Transcript(
                conversation_id=conversation_id,
                turns=transcript_turns,
            )
            session.add(transcript)
        await session.flush()

        # ------------------------------------------------------------------
        # 3. Generate call summary
        # ------------------------------------------------------------------
        summary_data = await generate_call_summary(
            conversation_id=conversation_id,
            transcript_turns=transcript_turns,
        )

        # Check for existing summary
        existing_summary_result = await session.execute(
            select(CallSummary).where(CallSummary.conversation_id == conversation_id)
        )
        existing_summary = existing_summary_result.scalar_one_or_none()

        if existing_summary:
            existing_summary.summary = summary_data["summary"]
            existing_summary.action_items = summary_data["action_items"]
            existing_summary.memories = summary_data["memories"]
            existing_summary.open_loops = summary_data["open_loops"]
            existing_summary.entities = summary_data["entities"]
            existing_summary.sentiment = summary_data["sentiment"]
            existing_summary.priority = summary_data["priority"]
            existing_summary.next_call_context = summary_data["next_call_context"]
            existing_summary.topics = summary_data.get("topics", [])
        else:
            call_summary = CallSummary(
                conversation_id=conversation_id,
                summary=summary_data["summary"],
                action_items=summary_data["action_items"],
                memories=summary_data["memories"],
                open_loops=summary_data["open_loops"],
                entities=summary_data["entities"],
                sentiment=summary_data["sentiment"],
                priority=summary_data["priority"],
                next_call_context=summary_data["next_call_context"],
                topics=summary_data.get("topics", []),
            )
            session.add(call_summary)

        await session.flush()

        # ------------------------------------------------------------------
        # 4. Extract memories (requires workspace_id and user_id)
        # ------------------------------------------------------------------
        memories_saved = 0
        if user_id and workspace_id and transcript_turns:
            try:
                memories = await extract_memories_from_transcript(
                    conversation_id=conversation_id,
                    transcript_turns=transcript_turns,
                    db=session,
                    workspace_id=workspace_id,
                    user_id=user_id,
                )
                memories_saved = len(memories)
            except Exception as exc:
                logger.error("Memory extraction failed", error=str(exc))

        # ------------------------------------------------------------------
        # 5. Compute analytics
        # ------------------------------------------------------------------
        try:
            await compute_and_save_analytics(
                db=session,
                conversation_id=conversation_id,
                transcript_turns=transcript_turns,
                latency_samples=latency_samples,
            )
        except Exception as exc:
            logger.error("Analytics computation failed", error=str(exc))

        await session.commit()

    logger.info(
        "Post-call processing completed",
        conversation_id=str(conversation_id),
        memories_saved=memories_saved,
    )

    return {
        "conversation_id": str(conversation_id),
        "memories_saved": memories_saved,
        "summary_generated": bool(summary_data.get("summary")),
        "turns_processed": len(transcript_turns),
    }
