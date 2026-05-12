#!/usr/bin/env python3
"""
Seed the database with a demo workspace, user, sample memories, and conversations.

Run inside the API container:
    docker-compose exec api python scripts/seed-demo.py

Or from the repo root:
    make seed-demo
"""

import asyncio
import os
import sys
import uuid
from datetime import datetime, timedelta, timezone

# Ensure the app module is importable when run from /app
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

DEMO_EMAIL = "demo@voiceai.local"
DEMO_PASSWORD = "Demo1234!"
DEMO_WORKSPACE = "Demo Workspace"


async def seed() -> None:
    # Import here so the script only fails at runtime, not import time
    try:
        from app.core.config import settings
        from app.core.security import get_password_hash
        from app.db.session import AsyncSessionLocal
        from app.db.models import User, Workspace, WorkspaceMember, Memory, Conversation
    except ImportError as e:
        print(f"ERROR: Could not import app modules: {e}")
        print("Make sure you're running this inside the API container.")
        sys.exit(1)

    async with AsyncSessionLocal() as db:
        # ── Workspace ──────────────────────────────────────────────────────────
        workspace_id = uuid.uuid4()
        workspace = Workspace(
            id=workspace_id,
            name=DEMO_WORKSPACE,
            slug="demo",
            created_at=datetime.now(timezone.utc),
        )
        db.add(workspace)

        # ── User ───────────────────────────────────────────────────────────────
        user_id = uuid.uuid4()
        user = User(
            id=user_id,
            email=DEMO_EMAIL,
            hashed_password=get_password_hash(DEMO_PASSWORD),
            full_name="Demo User",
            is_active=True,
            is_verified=True,
            created_at=datetime.now(timezone.utc),
        )
        db.add(user)

        # ── Workspace membership ───────────────────────────────────────────────
        member = WorkspaceMember(
            workspace_id=workspace_id,
            user_id=user_id,
            role="owner",
        )
        db.add(member)

        # ── Sample memories ────────────────────────────────────────────────────
        memories = [
            {
                "content": "User prefers concise answers without unnecessary filler words.",
                "category": "preferences",
                "importance": 0.9,
            },
            {
                "content": "User works at Acme Corp as a senior product manager.",
                "category": "facts",
                "importance": 0.8,
            },
            {
                "content": "User is working on Q3 OKRs and wants to track progress on the voice AI integration project.",
                "category": "tasks",
                "importance": 0.85,
            },
            {
                "content": "User's manager is Sarah Chen. They have a weekly sync every Monday at 10am.",
                "category": "relationships",
                "importance": 0.7,
            },
            {
                "content": "Acme Corp uses Salesforce as their CRM. Opportunity IDs start with 'OPP-'.",
                "category": "business",
                "importance": 0.75,
            },
            {
                "content": "User tends to ask follow-up questions in rapid succession — context should be maintained across turns.",
                "category": "patterns",
                "importance": 0.6,
            },
        ]

        for m in memories:
            memory = Memory(
                id=uuid.uuid4(),
                workspace_id=workspace_id,
                user_id=user_id,
                content=m["content"],
                category=m["category"],
                importance_score=m["importance"],
                # Embedding left as None — will be populated by the background worker
                embedding=None,
                created_at=datetime.now(timezone.utc) - timedelta(days=7),
                last_accessed_at=datetime.now(timezone.utc) - timedelta(days=1),
            )
            db.add(memory)

        # ── Sample conversations ────────────────────────────────────────────────
        conversations = [
            {
                "title": "Q3 planning discussion",
                "provider": "openai",
                "duration_seconds": 342,
                "message_count": 18,
                "summary": "Discussed Q3 OKR progress. Voice AI integration on track for August release. Need to coordinate with engineering on WebSocket performance.",
                "days_ago": 3,
            },
            {
                "title": "Salesforce pipeline review",
                "provider": "gemini",
                "duration_seconds": 195,
                "message_count": 12,
                "summary": "Reviewed top 5 open opportunities in Salesforce. Two deals need follow-up this week. Total pipeline value ~$420k.",
                "days_ago": 1,
            },
        ]

        for c in conversations:
            conv = Conversation(
                id=uuid.uuid4(),
                workspace_id=workspace_id,
                user_id=user_id,
                title=c["title"],
                provider=c["provider"],
                status="ended",
                duration_seconds=c["duration_seconds"],
                message_count=c["message_count"],
                summary=c["summary"],
                started_at=datetime.now(timezone.utc) - timedelta(days=c["days_ago"]),
                ended_at=datetime.now(timezone.utc) - timedelta(days=c["days_ago"]) + timedelta(seconds=c["duration_seconds"]),
            )
            db.add(conv)

        await db.commit()

    print("\n Demo data seeded successfully!")
    print(f"\n   Email:    {DEMO_EMAIL}")
    print(f"   Password: {DEMO_PASSWORD}")
    print(f"   Workspace: {DEMO_WORKSPACE}")
    print("\n   Open http://localhost:3000 and log in with the credentials above.\n")


if __name__ == "__main__":
    asyncio.run(seed())
