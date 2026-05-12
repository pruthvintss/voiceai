from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ConversationAnalytics(Base):
    __tablename__ = "conversation_analytics"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    total_turns: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    user_turns: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    agent_turns: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    avg_response_latency_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    interruption_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    tools_called: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    words_spoken_user: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    words_spoken_agent: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    topics: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    sentiment_timeline: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    latency_samples: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    conversation: Mapped = relationship("Conversation", back_populates="analytics")

    def __repr__(self) -> str:
        return f"<ConversationAnalytics id={self.id} conversation_id={self.conversation_id}>"
