"""Discover endpoint — returns enriched researcher cards for the frontend."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import json

from app.database import get_session
from app.models.researcher import Researcher
from app.models.gr_rating import GRRating
from app.models.raw_metrics import RawMetrics

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
            "firebase_uid": r.google_scholar_id or "",
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
    from fastapi import HTTPException
    stmt = (
        select(Researcher, GRRating, RawMetrics)
        .join(GRRating, Researcher.id == GRRating.researcher_id)
        .outerjoin(RawMetrics, Researcher.id == RawMetrics.researcher_id)
        .where(Researcher.id == researcher_id)
    )
    result = (await session.execute(stmt)).first()
    if not result:
        raise HTTPException(status_code=404, detail="Researcher not found")

    r, gr, rm = result
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
        "firebase_uid": r.google_scholar_id or "",
        "openalex_id": r.openalex_id or "",
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
        # Research metrics from raw_metrics table
        "h_index": rm.h_index if rm else 0,
        "total_citations": rm.total_citations if rm else 0,
        "publications_count": rm.publications if rm else 0,
        "i10_index": rm.i10_index if rm else 0,
        "total_patents": rm.total_patents if rm else 0,
        # GR score breakdown
        "p1_score": round(gr.p1_score, 1),
        "p2_score": round(gr.p2_score, 1),
        "p3_score": round(gr.p3_score, 1),
        "p4_score": round(gr.p4_score, 1),
        "p5_score": round(gr.p5_score, 1),
    }


@router.get("/{researcher_id}/publications")
async def get_researcher_publications(researcher_id: str, session: AsyncSession = Depends(get_session)):
    """Fetch top publications from OpenAlex for a researcher."""
    from fastapi import HTTPException
    import httpx

    r = await session.get(Researcher, researcher_id)
    if not r:
        raise HTTPException(status_code=404, detail="Researcher not found")
    if not r.openalex_id:
        return {"publications": []}

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                "https://api.openalex.org/works",
                params={
                    "filter": f"authorships.author.id:{r.openalex_id}",
                    "sort": "cited_by_count:desc",
                    "per-page": "10",
                    "select": "id,doi,title,publication_year,cited_by_count,primary_location,type,open_access",
                },
                headers={"User-Agent": "GRConnect/1.0"},
            )
        if not resp.is_success:
            return {"publications": []}

        works = resp.json().get("results", [])
        pubs = []
        for w in works:
            venue = (w.get("primary_location") or {}).get("source") or {}
            pubs.append({
                "title": w.get("title", "Untitled"),
                "year": w.get("publication_year"),
                "citations": w.get("cited_by_count", 0),
                "doi": w.get("doi", ""),
                "venue": venue.get("display_name", ""),
                "type": w.get("type", ""),
                "open_access": (w.get("open_access") or {}).get("is_oa", False),
            })
        return {"publications": pubs}
    except Exception:
        return {"publications": []}
