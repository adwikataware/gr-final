import uuid
from datetime import datetime
from sqlalchemy import ForeignKey, String, DateTime, Float, Integer, func
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base


class RawMetrics(Base):
    __tablename__ = "raw_metrics"

    researcher_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("researchers.id"), primary_key=True
    )
    # P1 raw data
    h_index: Mapped[int] = mapped_column(Integer, default=0)
    total_citations: Mapped[int] = mapped_column(Integer, default=0)
    publications: Mapped[int] = mapped_column(Integer, default=0)
    i10_index: Mapped[int] = mapped_column(Integer, default=0)
    # P2 raw data
    fwci: Mapped[float | None] = mapped_column(Float)
    citation_velocity: Mapped[float | None] = mapped_column(Float)
    recency_index: Mapped[float | None] = mapped_column(Float)
    topic_prominence_cagr: Mapped[float | None] = mapped_column(Float)
    active_years: Mapped[int] = mapped_column(Integer, default=10)
    # P3 raw data
    sdg_count: Mapped[int] = mapped_column(Integer, default=0)
    sdg_mean_confidence: Mapped[float] = mapped_column(Float, default=0.0)
    oa_percentage: Mapped[float] = mapped_column(Float, default=0.0)
    societal_mentions: Mapped[int] = mapped_column(Integer, default=0)
    # P4 raw data
    total_patents: Mapped[int] = mapped_column(Integer, default=0)
    books_authored: Mapped[int] = mapped_column(Integer, default=0)
    books_edited: Mapped[int] = mapped_column(Integer, default=0)
    unique_funders: Mapped[int] = mapped_column(Integer, default=0)
    patent_links: Mapped[int] = mapped_column(Integer, default=0)
    # Metadata
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    source: Mapped[str] = mapped_column(String(50), default="openalex")
