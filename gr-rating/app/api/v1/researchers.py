import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models.researcher import Researcher
from app.models.gr_rating import GRRating
from app.schemas.rating import (
    ResearcherRatingResponse,
    ResearcherListResponse,
    ResearcherSearchResult,
    ComputingResponse,
    PillarDetail,
)

PILLAR_META = {
    "p1": {"label": "Core Research", "weight": 0.25},
    "p2": {"label": "Performance", "weight": 0.30},
    "p3": {"label": "Societal Impact", "weight": 0.15},
    "p4": {"label": "Innovation", "weight": 0.20},
    "p5": {"label": "Community", "weight": 0.10},
}

TIER_LABELS = {
    "GR-A": "Exceptional",
    "GR-B": "Distinguished",
    "GR-C": "Established",
    "GR-D": "Emerging",
    "GR-E": "Entry",
}

router = APIRouter(prefix="/api/v1/researchers", tags=["researchers"])


@router.get("/{researcher_id}/rating")
async def get_rating(
    researcher_id: uuid.UUID, session: AsyncSession = Depends(get_session)
):
    from app.cache import get_cached_rating, cache_gr_rating

    # 1. Check Redis cache first
    cached = await get_cached_rating(researcher_id)
    if cached:
        cached["_source"] = "cache"
        return cached

    # 2. Check DB
    researcher = await session.get(Researcher, researcher_id)
    if not researcher:
        raise HTTPException(status_code=404, detail="Researcher not found")

    rating = await session.get(GRRating, researcher_id)
    if not rating:
        return ComputingResponse()

    total = await session.scalar(select(func.count()).select_from(GRRating))

    pillars = {}
    for key in ["p1", "p2", "p3", "p4", "p5"]:
        pillars[key] = PillarDetail(
            score=getattr(rating, f"{key}_score"),
            label=PILLAR_META[key]["label"],
            weight=PILLAR_META[key]["weight"],
        )

    response = ResearcherRatingResponse(
        researcher_id=researcher.id,
        name=researcher.name,
        affiliation=researcher.affiliation,
        gr_rating=rating.gr_rating,
        tier=rating.tier,
        tier_label=TIER_LABELS.get(rating.tier, "Unknown"),
        rank=rating.rank_overall,
        total_researchers=total,
        pillars=pillars,
        computed_at=rating.computed_at,
    )

    # 3. Cache for next time
    await cache_gr_rating(researcher_id, response.model_dump())

    return response


@router.get("/{researcher_id}/rating/detailed")
async def get_rating_detailed(
    researcher_id: uuid.UUID, session: AsyncSession = Depends(get_session)
):
    from app.models.raw_metrics import RawMetrics

    researcher = await session.get(Researcher, researcher_id)
    if not researcher:
        raise HTTPException(status_code=404, detail="Researcher not found")

    rating = await session.get(GRRating, researcher_id)
    metrics = await session.get(RawMetrics, researcher_id)

    if not rating:
        return ComputingResponse()

    from app.scoring.pillar1 import pillar1_score
    from app.scoring.pillar2 import pillar2_score
    from app.scoring.pillar3 import pillar3_score
    from app.scoring.pillar4 import pillar4_score

    sub_scores = {}
    if metrics:
        sub_scores["p1"] = pillar1_score(
            metrics.h_index, metrics.total_citations,
            metrics.publications, metrics.i10_index,
        )
        sub_scores["p2"] = pillar2_score(
            metrics.fwci or 0, metrics.citation_velocity or 0,
            metrics.recency_index or 0, metrics.topic_prominence_cagr or 0,
            metrics.active_years,
        )
        sub_scores["p3"] = pillar3_score(
            metrics.sdg_count, metrics.sdg_mean_confidence,
            metrics.oa_percentage, metrics.societal_mentions,
        )
        sub_scores["p4"] = pillar4_score(
            metrics.total_patents, metrics.books_authored,
            metrics.books_edited, metrics.unique_funders,
            metrics.patent_links,
        )

    total = await session.scalar(select(func.count()).select_from(GRRating))

    pillars = {}
    for key in ["p1", "p2", "p3", "p4", "p5"]:
        pillars[key] = PillarDetail(
            score=getattr(rating, f"{key}_score"),
            label=PILLAR_META[key]["label"],
            weight=PILLAR_META[key]["weight"],
        )

    raw_metrics = None
    if metrics:
        raw_metrics = {
            "researcher_id": str(metrics.researcher_id),
            "h_index": metrics.h_index,
            "total_citations": metrics.total_citations,
            "publications": metrics.publications,
            "i10_index": metrics.i10_index,
            "fwci": metrics.fwci,
            "citation_velocity": metrics.citation_velocity,
            "recency_index": metrics.recency_index,
            "sdg_count": metrics.sdg_count,
            "oa_percentage": metrics.oa_percentage,
            "total_patents": metrics.total_patents,
            "books_authored": metrics.books_authored,
            "unique_funders": metrics.unique_funders,
        }

    return {
        "researcher_id": str(researcher.id),
        "name": researcher.name,
        "affiliation": researcher.affiliation,
        "gr_rating": rating.gr_rating,
        "tier": rating.tier,
        "tier_label": TIER_LABELS.get(rating.tier, "Unknown"),
        "rank": rating.rank_overall,
        "total_researchers": total,
        "pillars": pillars,
        "sub_scores": sub_scores,
        "raw_metrics": raw_metrics,
        "computed_at": rating.computed_at.isoformat() if rating.computed_at else None,
    }


@router.get("/search")
async def search_researchers(
    q: str = Query(..., min_length=1),
    limit: int = Query(default=10, le=50),
    session: AsyncSession = Depends(get_session),
):
    # Try Meilisearch first (fast fuzzy search)
    from app.search import search_researchers as meili_search
    hits = await meili_search(q, limit=limit)
    if hits:
        return [
            ResearcherSearchResult(
                researcher_id=h["id"],
                name=h["name"],
                affiliation=h.get("affiliation", ""),
                gr_rating=h.get("gr_rating"),
                tier=h.get("tier"),
            )
            for h in hits
        ]

    # Fallback to DB ILIKE search
    stmt = (
        select(Researcher, GRRating)
        .outerjoin(GRRating, Researcher.id == GRRating.researcher_id)
        .where(
            Researcher.name.ilike(f"%{q}%")
            | Researcher.affiliation.ilike(f"%{q}%")
        )
        .limit(limit)
    )
    results = (await session.execute(stmt)).all()

    return [
        ResearcherSearchResult(
            researcher_id=r.id,
            name=r.name,
            affiliation=r.affiliation,
            gr_rating=gr.gr_rating if gr else None,
            tier=gr.tier if gr else None,
        )
        for r, gr in results
    ]


@router.get("/top")
async def top_researchers(
    limit: int = Query(default=20, le=100),
    offset: int = Query(default=0, ge=0),
    tier: str | None = Query(default=None),
    sort: str = Query(default="gr_rating"),
    session: AsyncSession = Depends(get_session),
):
    stmt = (
        select(Researcher, GRRating)
        .join(GRRating, Researcher.id == GRRating.researcher_id)
    )

    if tier:
        stmt = stmt.where(GRRating.tier == tier)

    stmt = stmt.order_by(GRRating.gr_rating.desc()).offset(offset).limit(limit)

    results = (await session.execute(stmt)).all()

    count_stmt = select(func.count()).select_from(GRRating)
    if tier:
        count_stmt = count_stmt.where(GRRating.tier == tier)
    total = await session.scalar(count_stmt)

    researchers = [
        ResearcherSearchResult(
            researcher_id=r.id,
            name=r.name,
            affiliation=r.affiliation,
            gr_rating=gr.gr_rating,
            tier=gr.tier,
        )
        for r, gr in results
    ]

    return ResearcherListResponse(
        researchers=researchers, total=total or 0, limit=limit, offset=offset
    )


@router.post("/ingest", status_code=202)
async def ingest_researcher(
    openalex_id: str = Query(..., min_length=1),
    session: AsyncSession = Depends(get_session),
):
    """Add a new researcher by OpenAlex ID and queue score computation."""
    existing = (
        await session.execute(
            select(Researcher).where(Researcher.openalex_id == openalex_id)
        )
    ).scalar_one_or_none()

    if existing:
        from app.workers.compute_scores import compute_full_profile
        task = compute_full_profile.delay(str(existing.id))
        return {"status": "accepted", "researcher_id": str(existing.id), "task_id": task.id}

    researcher = Researcher(openalex_id=openalex_id, name="Pending", affiliation="")
    session.add(researcher)
    await session.flush()
    await session.commit()

    from app.workers.compute_scores import compute_full_profile
    task = compute_full_profile.delay(str(researcher.id))

    return {"status": "accepted", "researcher_id": str(researcher.id), "task_id": task.id}


@router.post("/{researcher_id}/refresh", status_code=202)
async def refresh_researcher(
    researcher_id: uuid.UUID, session: AsyncSession = Depends(get_session)
):
    researcher = await session.get(Researcher, researcher_id)
    if not researcher:
        raise HTTPException(status_code=404, detail="Researcher not found")

    from app.workers.compute_scores import compute_full_profile
    task = compute_full_profile.delay(str(researcher_id))

    return {"status": "accepted", "task_id": task.id, "message": "Recompute queued."}
