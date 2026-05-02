import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base


class Researcher(Base):
    __tablename__ = "researchers"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    affiliation: Mapped[str | None] = mapped_column(String(500))
    openalex_id: Mapped[str | None] = mapped_column(String(50), unique=True)
    semantic_scholar_id: Mapped[str | None] = mapped_column(String(50))
    orcid: Mapped[str | None] = mapped_column(String(20))
    google_scholar_id: Mapped[str | None] = mapped_column(String(64))
    # Enriched fields from OpenAlex
    bio: Mapped[str | None] = mapped_column(Text)
    photo_url: Mapped[str | None] = mapped_column(String(500))
    topics: Mapped[str | None] = mapped_column(Text)        # JSON array stored as text
    sdg_ids: Mapped[str | None] = mapped_column(String(100))  # comma-separated e.g. "3,7,13"
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
