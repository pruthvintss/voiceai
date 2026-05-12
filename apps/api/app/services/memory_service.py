from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Optional

import anthropic
import structlog
from sqlalchemy import and_, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.memory import Memory
from app.schemas.memory import MemoryCreate, MemorySearchResult
from app.services.embedding_service import get_embedding, get_embeddings_batch

logger = structlog.get_logger(__name__)


MEMORY_EXTRACTION_SYSTEM_PROMPT = """You are a memory extraction specialist for a voice AI assistant.

Your task is to analyze conversation transcripts and extract structured memories that will help the AI assistant provide better, more personalized responses in future conversations.

Extract memories in the following categories:
- preferences: User's likes, dislikes, preferences about communication style, topics, products, etc.
- facts: Factual information about the user (job, location, family, skills, background)
- tasks: Action items, todos, things the user needs to do or wants to track
- relationships: Information about people, organizations, or relationships the user mentions
- business: Business context, projects, goals, metrics, or professional information
- issues: Problems, challenges, or pain points the user is experiencing
- patterns: Recurring themes, behavioral patterns, or habits observed

For each memory, assign an importance score from 0.0 to 1.0:
- 0.9-1.0: Critical, highly personal, explicitly stated as important
- 0.7-0.8: Significant, likely to come up again, career/relationship/health related
- 0.5-0.6: Moderately useful, general preferences or context
- 0.3-0.4: Minor details, could be useful occasionally
- 0.1-0.2: Passing mentions, low value

Return ONLY a valid JSON array of memory objects with no additional text:
[
  {
    "category": "preferences",
    "content": "User prefers morning meetings and dislikes late afternoon calls",
    "importance": 0.7
  }
]

Be specific and actionable. Extract only meaningful, reusable information. Do not extract trivial conversation filler."""


SUMMARIZATION_SYSTEM_PROMPT = """You are an expert conversation analyst for a voice AI platform.

Analyze the provided conversation transcript and produce a comprehensive structured summary.

Your output must be a valid JSON object with exactly this structure:
{
  "summary": "2-3 sentence narrative summary of the conversation",
  "action_items": ["specific actionable item 1", "specific actionable item 2"],
  "memories": [
    {"category": "facts|preferences|tasks|relationships|business|issues|patterns", "content": "memory content", "importance": 0.8}
  ],
  "open_loops": ["unresolved topic or question 1", "pending item 2"],
  "entities": [
    {"name": "entity name", "type": "person|org|topic|product"}
  ],
  "sentiment": "positive|neutral|negative",
  "priority": "high|medium|low",
  "next_call_context": "Brief context paragraph to orient the AI at the start of the next conversation with this user"
}

Priority guide:
- high: Urgent issues, important decisions, time-sensitive matters
- medium: Ongoing projects, general follow-ups
- low: Casual conversation, informational discussions

Be thorough with action items and next_call_context — these directly improve future call quality.
Return ONLY the JSON object with no markdown or additional text."""


async def extract_memories_from_transcript(
    conversation_id: uuid.UUID,
    transcript_turns: list[dict],
    db: AsyncSession,
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
) -> list[Memory]:
    """Use Claude to extract structured memories from a conversation transcript."""
    if not transcript_turns:
        return []

    # Format transcript for LLM
    transcript_text = "\n".join(
        f"[{turn['role'].upper()}]: {turn['content']}" for turn in transcript_turns
    )

    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    try:
        message = await client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4096,
            system=MEMORY_EXTRACTION_SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": f"Extract memories from this conversation transcript:\n\n{transcript_text}",
                }
            ],
        )
        raw_content = message.content[0].text.strip()
        extracted = json.loads(raw_content)
    except (json.JSONDecodeError, IndexError, anthropic.APIError) as exc:
        logger.error(
            "Memory extraction failed",
            error=str(exc),
            conversation_id=str(conversation_id),
        )
        return []

    if not isinstance(extracted, list):
        logger.warning("Memory extraction returned non-list", conversation_id=str(conversation_id))
        return []

    # Deduplicate against existing memories via vector similarity
    texts = [m.get("content", "") for m in extracted if m.get("content")]
    if not texts:
        return []

    embeddings = await get_embeddings_batch(texts)

    saved_memories: list[Memory] = []
    for mem_data, embedding in zip(extracted, embeddings):
        content = mem_data.get("content", "").strip()
        category = mem_data.get("category", "facts")
        importance = float(mem_data.get("importance", 0.5))

        if not content:
            continue

        # Check for near-duplicate via cosine similarity
        existing = await _find_similar_memory(
            db=db,
            workspace_id=workspace_id,
            user_id=user_id,
            embedding=embedding,
            threshold=settings.MEMORY_SIMILARITY_THRESHOLD,
        )

        if existing:
            # Update existing memory with new importance if higher
            if importance > existing.importance_score:
                await db.execute(
                    update(Memory)
                    .where(Memory.id == existing.id)
                    .values(
                        importance_score=importance,
                        content=content,
                        updated_at=datetime.now(tz=timezone.utc),
                        embedding=embedding,
                    )
                )
                await db.flush()
            continue

        memory = Memory(
            workspace_id=workspace_id,
            user_id=user_id,
            category=category,
            content=content,
            importance_score=importance,
            source_conversation_id=conversation_id,
            embedding=embedding,
        )
        db.add(memory)
        saved_memories.append(memory)

    await db.flush()
    logger.info(
        "Memories extracted and saved",
        conversation_id=str(conversation_id),
        count=len(saved_memories),
    )
    return saved_memories


async def _find_similar_memory(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    embedding: list[float],
    threshold: float = 0.85,
) -> Optional[Memory]:
    """Find the most similar active memory using pgvector cosine distance."""
    from sqlalchemy import text

    # Use pgvector cosine distance operator: 1 - (a <=> b) = similarity
    result = await db.execute(
        text(
            """
            SELECT id, 1 - (embedding <=> CAST(:embedding AS vector)) as similarity
            FROM memories
            WHERE workspace_id = :workspace_id
              AND user_id = :user_id
              AND is_active = true
              AND embedding IS NOT NULL
            ORDER BY embedding <=> CAST(:embedding AS vector)
            LIMIT 1
            """
        ),
        {
            "embedding": str(embedding),
            "workspace_id": str(workspace_id),
            "user_id": str(user_id),
        },
    )
    row = result.fetchone()
    if row is None:
        return None

    mem_id, similarity = row
    if similarity < threshold:
        return None

    mem_result = await db.execute(select(Memory).where(Memory.id == uuid.UUID(str(mem_id))))
    return mem_result.scalar_one_or_none()


async def search_memories(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    query: str,
    category: Optional[str] = None,
    limit: int = 20,
) -> list[MemorySearchResult]:
    """Semantic search over memories using pgvector."""
    from sqlalchemy import text

    query_embedding = await get_embedding(query)

    category_filter = "AND category = :category" if category else ""
    params: dict = {
        "embedding": str(query_embedding),
        "workspace_id": str(workspace_id),
        "user_id": str(user_id),
        "limit": limit,
        "threshold": settings.MEMORY_SIMILARITY_THRESHOLD,
    }
    if category:
        params["category"] = category

    result = await db.execute(
        text(
            f"""
            SELECT id, 1 - (embedding <=> CAST(:embedding AS vector)) as similarity
            FROM memories
            WHERE workspace_id = :workspace_id
              AND user_id = :user_id
              AND is_active = true
              AND embedding IS NOT NULL
              {category_filter}
              AND 1 - (embedding <=> CAST(:embedding AS vector)) >= :threshold
            ORDER BY embedding <=> CAST(:embedding AS vector)
            LIMIT :limit
            """
        ),
        params,
    )
    rows = result.fetchall()

    if not rows:
        return []

    memory_ids = [uuid.UUID(str(r[0])) for r in rows]
    sim_map = {uuid.UUID(str(r[0])): float(r[1]) for r in rows}

    mem_result = await db.execute(
        select(Memory).where(Memory.id.in_(memory_ids))
    )
    memories = mem_result.scalars().all()

    # Update last_accessed_at
    await db.execute(
        update(Memory)
        .where(Memory.id.in_(memory_ids))
        .values(last_accessed_at=datetime.now(tz=timezone.utc))
    )
    await db.flush()

    results = []
    for mem in memories:
        data = {
            "id": mem.id,
            "workspace_id": mem.workspace_id,
            "user_id": mem.user_id,
            "category": mem.category,
            "content": mem.content,
            "importance_score": mem.importance_score,
            "source_conversation_id": mem.source_conversation_id,
            "is_active": mem.is_active,
            "created_at": mem.created_at,
            "updated_at": mem.updated_at,
            "last_accessed_at": mem.last_accessed_at,
            "similarity_score": sim_map.get(mem.id, 0.0),
        }
        results.append(MemorySearchResult(**data))

    results.sort(key=lambda x: x.similarity_score, reverse=True)
    return results


async def create_memory(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    data: MemoryCreate,
) -> Memory:
    """Manually create a memory with embedding generation."""
    embedding = await get_embedding(data.content)
    memory = Memory(
        workspace_id=workspace_id,
        user_id=user_id,
        category=data.category,
        content=data.content,
        importance_score=data.importance_score,
        embedding=embedding,
    )
    db.add(memory)
    await db.flush()
    await db.refresh(memory)
    return memory


async def get_memories_for_context(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    category: Optional[str] = None,
    limit: int = 10,
) -> list[Memory]:
    """Retrieve top memories by importance for context injection."""
    filters = [
        Memory.workspace_id == workspace_id,
        Memory.user_id == user_id,
        Memory.is_active == True,
        Memory.embedding.is_not(None),
    ]
    if category:
        filters.append(Memory.category == category)

    result = await db.execute(
        select(Memory)
        .where(and_(*filters))
        .order_by(Memory.importance_score.desc())
        .limit(limit)
    )
    return list(result.scalars().all())
