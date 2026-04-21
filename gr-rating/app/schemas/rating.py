import uuid
from datetime import datetime
from pydantic import BaseModel


class PillarDetail(BaseModel):
    score: float
    label: str
    weight: float


class ResearcherRatingResponse(BaseModel):
    researcher_id: uuid.UUID
    name: str
    affiliation: str | None
    gr_rating: float
    tier: str
    tier_label: str
    rank: int | None
    total_researchers: int | None
    pillars: dict[str, PillarDetail]
    computed_at: datetime | None


class ResearcherSearchResult(BaseModel):
    researcher_id: uuid.UUID
    name: str
    affiliation: str | None
    gr_rating: float | None
    tier: str | None


class ResearcherListResponse(BaseModel):
    researchers: list[ResearcherSearchResult]
    total: int
    limit: int
    offset: int


class ComputingResponse(BaseModel):
    status: str = "computing"
    message: str = "GR Rating is being computed. Please retry in 30 seconds."
