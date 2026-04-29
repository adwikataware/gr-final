"""Discover endpoint — returns enriched researcher cards for the frontend."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import json

from app.database import get_session
from app.models.researcher import Researcher
from app.models.gr_rating import GRRating

router = APIRouter(prefix="/api/v1/discover", tags=["discover"])

TIER_LABEL = {
    "GR-A": "Elite",
    "GR-B": "Premier",
    "GR-C": "Verified",
    "GR-D": "Verified",
    "GR-E": "Verified",
}

TIER_RANK = {"GR-A": 1, "GR-B": 2, "GR-C": 3, "GR-D": 4, "GR-E": 5}


@router.get("")
async def discover_researchers(
    q: str | None = Query(default=None),
    topic: str | None = Query(default=None),
    sdg: int | None = Query(default=None),
    tier: str | None = Query(default=None),
    limit: int = Query(default=20, le=100),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_session),
):
    stmt = (
        select(Researcher, GRRating)
        .join(GRRating, Researcher.id == GRRating.researcher_id)
        .order_by(GRRating.gr_rating.desc())
    )

    if q:
        stmt = stmt.where(
            Researcher.name.ilike(f"%{q}%")
            | Researcher.affiliation.ilike(f"%{q}%")
            | Researcher.topics.ilike(f"%{q}%")
        )
    if tier:
        stmt = stmt.where(GRRating.tier == tier)
    if sdg:
        stmt = stmt.where(Researcher.sdg_ids.ilike(f"%{sdg}%"))
    if topic:
        stmt = stmt.where(Researcher.topics.ilike(f"%{topic}%"))

    total_stmt = stmt.with_only_columns(select(Researcher.id).subquery().c[0])
    results = (await session.execute(stmt.offset(offset).limit(limit))).all()

    items = []
    for r, gr in results:
        topics_list: list[str] = []
        if r.topics:
            try:
                topics_list = json.loads(r.topics)
            except Exception:
                topics_list = [t.strip() for t in r.topics.split(",") if t.strip()]

        sdg_list: list[int] = []
        if r.sdg_ids:
            try:
                sdg_list = [int(x) for x in r.sdg_ids.split(",") if x.strip().isdigit()]
            except Exception:
                pass

        items.append({
            "id": str(r.id),
            "openalex_id": r.openalex_id,
            "name": r.name,
            "affiliation": r.affiliation or "",
            "bio": r.bio or "",
            "photo_url": r.photo_url or "",
            "topics": topics_list,
            "sdg_ids": sdg_list,
            "gr_rating": round(gr.gr_rating, 1),
            "tier": gr.tier,
            "tier_label": TIER_LABEL.get(gr.tier, "Verified"),
            "rank": gr.rank_overall,
            "orcid": r.orcid or "",
        })

    return {"researchers": items, "total": len(items), "offset": offset, "limit": limit}


@router.get("/{researcher_id}")
async def get_researcher(
    researcher_id: str,
    session: AsyncSession = Depends(get_session),
):
    stmt = (
        select(Researcher, GRRating)
        .join(GRRating, Researcher.id == GRRating.researcher_id)
        .where(Researcher.id == researcher_id)
    )
    result = (await session.execute(stmt)).first()
    if not result:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Researcher not found")

    r, gr = result
    topics_list: list[str] = []
    if r.topics:
        try:
            topics_list = json.loads(r.topics)
        except Exception:
            topics_list = [t.strip() for t in r.topics.split(",") if t.strip()]

    sdg_list: list[int] = []
    if r.sdg_ids:
        try:
            sdg_list = [int(x) for x in r.sdg_ids.split(",") if x.strip().isdigit()]
        except Exception:
            pass

    return {
        "id": str(r.id),
        "openalex_id": r.openalex_id,
        "name": r.name,
        "affiliation": r.affiliation or "",
        "bio": r.bio or "",
        "photo_url": r.photo_url or "",
        "topics": topics_list,
        "sdg_ids": sdg_list,
        "gr_rating": round(gr.gr_rating, 1),
        "tier": gr.tier,
        "tier_label": TIER_LABEL.get(gr.tier, "Verified"),
        "rank": gr.rank_overall,
        "orcid": r.orcid or "",
    }
