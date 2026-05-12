from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class CallSummary(Base):
    __tablename__ = "call_summaries"

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
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    action_items: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    memories: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    open_loops: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    entities: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    sentiment: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )  # positive / neutral / negative
    priority: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )  # high / medium / low
    next_call_context: Mapped[str | None] = mapped_column(Text, nullable=True)
    topics: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    conversation: Mapped = relationship("Conversation", back_populates="summary")

    def __repr__(self) -> str:
        return f"<CallSummary id={self.id} conversation_id={self.conversation_id}>"
