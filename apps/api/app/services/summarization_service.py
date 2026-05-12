from __future__ import annotations

import json
import uuid
from typing import Any

import anthropic
import structlog

from app.core.config import settings
from app.services.memory_service import SUMMARIZATION_SYSTEM_PROMPT

logger = structlog.get_logger(__name__)


async def generate_call_summary(
    conversation_id: uuid.UUID,
    transcript_turns: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    Generate a structured call summary using Claude.

    Returns a dict matching the CallSummary schema:
    {
      "summary": str,
      "action_items": list[str],
      "memories": list[dict],
      "open_loops": list[str],
      "entities": list[dict],
      "sentiment": str,
      "priority": str,
      "next_call_context": str,
      "topics": list[str],
    }
    """
    if not transcript_turns:
        return _empty_summary()

    transcript_text = "\n".join(
        f"[{turn['role'].upper()}]: {turn['content']}" for turn in transcript_turns
    )

    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    try:
        message = await client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4096,
            system=SUMMARIZATION_SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": f"Analyze this voice conversation transcript and produce a structured summary:\n\n{transcript_text}",
                }
            ],
        )
        raw = message.content[0].text.strip()
        parsed = json.loads(raw)

        # Normalize fields
        return {
            "summary": parsed.get("summary", ""),
            "action_items": parsed.get("action_items", []),
            "memories": parsed.get("memories", []),
            "open_loops": parsed.get("open_loops", []),
            "entities": parsed.get("entities", []),
            "sentiment": parsed.get("sentiment", "neutral"),
            "priority": parsed.get("priority", "medium"),
            "next_call_context": parsed.get("next_call_context", ""),
            "topics": [e["name"] for e in parsed.get("entities", []) if e.get("type") == "topic"],
        }
    except (json.JSONDecodeError, anthropic.APIError, KeyError, IndexError) as exc:
        logger.error(
            "Call summarization failed",
            error=str(exc),
            conversation_id=str(conversation_id),
        )
        return _empty_summary()


def _empty_summary() -> dict[str, Any]:
    return {
        "summary": "No summary available.",
        "action_items": [],
        "memories": [],
        "open_loops": [],
        "entities": [],
        "sentiment": "neutral",
        "priority": "low",
        "next_call_context": "",
        "topics": [],
    }
