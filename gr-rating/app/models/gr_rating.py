import uuid
from datetime import datetime
from sqlalchemy import ForeignKey, String, DateTime, Float, Integer, Index, func
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base


class GRRating(Base):
    __tablename__ = "gr_ratings"

    researcher_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("researchers.id"), primary_key=True
    )
    p1_score: Mapped[float] = mapped_column(Float, nullable=False)
    p2_score: Mapped[float] = mapped_column(Float, nullable=False)
    p3_score: Mapped[float] = mapped_column(Float, nullable=False)
    p4_score: Mapped[float] = mapped_column(Float, nullable=False)
    p5_score: Mapped[float] = mapped_column(Float, nullable=False, default=50.0)
    gr_rating: Mapped[float] = mapped_column(Float, nullable=False)
    tier: Mapped[str] = mapped_column(String(4), nullable=False)
    rank_overall: Mapped[int | None] = mapped_column(Integer)
    computed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    __table_args__ = (
        Index("idx_gr_ratings_score", "gr_rating", postgresql_using="btree"),
        Index("idx_gr_ratings_tier", "tier"),
    )
