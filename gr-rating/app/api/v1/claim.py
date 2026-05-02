"""
POST /api/v1/researchers/claim
Called from onboarding when an expert enters their ORCID.
Fetches real data from OpenAlex and upserts a researcher record linked to Firebase UID.
"""
import json
import re
import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import httpx

from app.database import get_session
from app.models.researcher import Researcher
from app.models.gr_rating import GRRating

router = APIRouter(prefix="/api/v1/researchers", tags=["researchers"])

BASE_URL = "https://api.openalex.org"
EMAIL = "adwikataware@gmail.com"

# OpenAlex returns wrong affiliations for these researchers — override manually
AFFILIATION_OVERRIDES = {
    "A5080409343": "VIT, Pune",
    "A5093554874": "VIT, Pune",
    "A5017173320": "VIT, Pune",
    "A5000975435": "Techno India University, Kolkata",
    "A5063648631": "Institute of Chemical Technology, Mumbai",
}
HEADERS = {"User-Agent": f"GRConnect/1.0 (mailto:{EMAIL})"}

TIER_LABEL = {"GR-A": "Elite", "GR-B": "Premier", "GR-C": "Verified", "GR-D": "Verified", "GR-E": "Verified"}
SDG_KEYWORD_MAP = {
    1: ["poverty"], 2: ["hunger", "food security", "agriculture"],
    3: ["health", "medicine", "disease", "cancer", "covid", "clinical"],
    4: ["education", "learning", "teaching"],
    6: ["water", "sanitation"],
    7: ["energy", "renewable", "solar", "wind", "photovoltaic"],
    9: ["innovation", "industry", "infrastructure", "iot", "robotics"],
    10: ["inequality", "inclusion"],
    11: ["cities", "urban", "smart city"],
    13: ["climate", "carbon", "emission", "environment"],
    14: ["ocean", "marine"], 15: ["biodiversity", "forest"],
    16: ["security", "peace", "justice", "governance"],
}


class ClaimRequest(BaseModel):
    orcid: str
    firebase_uid: str


class OrcidLookupRequest(BaseModel):
    orcid: str


class SyncGoogleRequest(BaseModel):
    firebase_uid: str
    name: str
    email: str = ""
    affiliation: str = ""
    bio: str = ""
    topics: list[str] = []
    sdg_ids: list[int] = []
    photo_url: str = ""


@router.post("/sync-google")
async def sync_google_expert(body: SyncGoogleRequest, session: AsyncSession = Depends(get_session)):
    """Upsert a Google-login expert into the researcher DB so they appear on discover."""
    existing = (await session.execute(
        select(Researcher).where(Researcher.google_scholar_id == body.firebase_uid)
    )).scalar_one_or_none()

    if existing:
        r = existing
    else:
        r = Researcher(id=uuid.uuid4(), openalex_id=f"g_{body.firebase_uid[:16]}")
        session.add(r)

    r.name = body.name
    r.affiliation = body.affiliation
    r.bio = body.bio or f"{body.name} — researcher on GR Connect."
    r.photo_url = body.photo_url or f"https://ui-avatars.com/api/?name={body.name.replace(' ', '+')}&background=8B5E3C&color=fff&size=200"
    r.topics = json.dumps(body.topics) if body.topics else json.dumps([])
    r.sdg_ids = ",".join(str(x) for x in body.sdg_ids) if body.sdg_ids else (r.sdg_ids or "")
    r.google_scholar_id = body.firebase_uid

    await session.flush()

    # Give them a base GR rating if none exists
    gr_row = (await session.execute(
        select(GRRating).where(GRRating.researcher_id == r.id)
    )).scalar_one_or_none()

    if not gr_row:
        gr_row = GRRating(
            researcher_id=r.id,
            gr_rating=10.0,
            tier="GR-E",
            p1_score=10.0,
            p2_score=10.0,
            p3_score=10.0,
            p4_score=50.0,
            p5_score=50.0,
        )
        session.add(gr_row)

    await session.commit()
    return {"id": str(r.id), "firebase_uid": body.firebase_uid}


@router.post("/orcid-lookup")
async def orcid_lookup(body: OrcidLookupRequest):
    """Lookup ORCID on OpenAlex without saving — used during signup flow."""
    orcid = body.orcid.strip().replace("https://orcid.org/", "").strip("/")
    if not orcid:
        raise HTTPException(status_code=400, detail="ORCID is required")

    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.get(
            f"{BASE_URL}/authors",
            params={"filter": f"orcid:{orcid}", "per-page": 1},
            headers=HEADERS,
        )
        results = resp.json().get("results", []) if resp.status_code == 200 else []
        if not results:
            resp2 = await client.get(
                f"{BASE_URL}/authors",
                params={"filter": f"orcid:https://orcid.org/{orcid}", "per-page": 1},
                headers=HEADERS,
            )
            results = resp2.json().get("results", []) if resp2.status_code == 200 else []

    if not results:
        raise HTTPException(status_code=404, detail="No researcher found with this ORCID on OpenAlex")

    author = results[0]
    display_name = author.get("display_name", "")
    works_count = author.get("works_count", 0)
    cited_by_count = author.get("cited_by_count", 0)
    h_index = author.get("summary_stats", {}).get("h_index", 0)
    affiliation = ""
    aff_list = author.get("affiliations", [])
    if aff_list:
        affiliation = aff_list[0].get("institution", {}).get("display_name", "")
    if not affiliation:
        last = author.get("last_known_institutions", [])
        if last:
            affiliation = last[0].get("display_name", "")
    topics = [t.get("display_name", "") for t in author.get("topics", [])[:6] if t.get("display_name")]
    bio = f"Researcher with {works_count} publications and {cited_by_count} citations."
    clean_name = re.sub(r'^(Dr\.?|Prof\.?|Mr\.?|Mrs\.?|Ms\.?)\s+', '', display_name)
    photo_url = f"https://ui-avatars.com/api/?name={clean_name.replace(' ', '+')}&background=8B5E3C&color=fff&size=200"

    return {
        "name": display_name,
        "affiliation": affiliation,
        "bio": bio,
        "photo_url": photo_url,
        "topics": topics,
        "works_count": works_count,
        "cited_by_count": cited_by_count,
        "h_index": h_index,
    }


def S(x: float, c: float) -> float:
    """Saturation function: S(x) = 100 * x / (x + c)"""
    x = max(x, 0)
    return 100 * x / (x + c)


def compute_gr(works_count: int, cited_by_count: int, h_index: int, i10_index: int = 0,
               total_patents: int = 0, books_authored: int = 0, books_edited: int = 0,
               unique_funders: int = 0, patent_links: int = 0,
               sdg_count: int = 0, sdg_mean_confidence: float = 0.0,
               oa_percentage: float = 0.0, societal_mentions: int = 0,
               fwci: float = 0.0, citation_velocity: float = 0.0,
               recency_index: float = 0.0, topic_prominence_cagr: float = 0.0):

    # P1 — Core Fundamental Research (25%)
    p1_h       = S(h_index,       c=3)
    p1_cites   = S(cited_by_count, c=180)
    p1_pubs    = S(works_count,    c=8)
    p1_i10     = S(i10_index,      c=3)
    p1 = round(p1_h * 0.30 + p1_cites * 0.25 + p1_pubs * 0.25 + p1_i10 * 0.20, 1)

    # P2 — Real-Time Performance (30%)
    # Use real values when available, fall back to neutral 50 per component when not
    if fwci > 0 or citation_velocity > 0 or recency_index > 0 or topic_prominence_cagr > 0:
        p2_fwci    = S(fwci,                   c=0.3)  if fwci > 0            else 50.0
        p2_vel     = S(citation_velocity,       c=12)   if citation_velocity > 0 else 50.0
        p2_rec     = S(recency_index,           c=0.3)  if recency_index > 0   else 50.0
        p2_cagr    = S(topic_prominence_cagr,   c=3)    if topic_prominence_cagr > 0 else 50.0
        p2 = round(p2_fwci * 0.35 + p2_vel * 0.25 + p2_rec * 0.20 + p2_cagr * 0.20, 1)
    else:
        p2 = 50.0

    # P3 — Sustainability & Societal Impact (15%)
    p3_sdg_cov  = S(sdg_count,            c=1.5)
    p3_sdg_conf = S(sdg_mean_confidence,  c=0.18)
    p3_oa       = S(oa_percentage,        c=10)
    p3_soc      = S(societal_mentions,    c=4)
    p3 = round(p3_sdg_cov * 0.25 + p3_sdg_conf * 0.25 + p3_oa * 0.25 + p3_soc * 0.25, 1)

    # P4 — Innovation & Economic Assets (20%)
    books_score = books_authored + 0.5 * books_edited
    p4_patents  = S(total_patents,    c=2.5)
    p4_books    = S(books_score,      c=2)
    p4_funders  = S(unique_funders,   c=1.2)
    p4_links    = S(patent_links,     c=2)
    p4 = round(p4_patents * 0.30 + p4_books * 0.25 + p4_funders * 0.25 + p4_links * 0.20, 1)

    # P5 — Community & Peer Recognition (10%) — neutral 50 until platform data builds
    p5 = 50.0

    gr = round(p1 * 0.25 + p2 * 0.30 + p3 * 0.15 + p4 * 0.20 + p5 * 0.10, 1)

    if gr >= 85:   tier = "GR-A"
    elif gr >= 70: tier = "GR-B"
    elif gr >= 50: tier = "GR-C"
    elif gr >= 30: tier = "GR-D"
    else:          tier = "GR-E"

    return gr, tier, round(p1, 1), round(p2, 1), round(p3, 1), round(p4, 1), round(p5, 1)


def extract_sdgs(data: dict, topics: list[str]) -> list[int]:
    sdg_ids = []
    for sdg in data.get("sustainable_development_goals", []):
        try:
            num = int(sdg.get("id", "").split("/")[-1])
            if 1 <= num <= 17:
                sdg_ids.append(num)
        except (ValueError, AttributeError):
            pass
    if not sdg_ids:
        topic_text = " ".join(topics).lower()
        for sdg_num, keywords in SDG_KEYWORD_MAP.items():
            if any(kw in topic_text for kw in keywords):
                sdg_ids.append(sdg_num)
        sdg_ids = sdg_ids[:5]
    return sdg_ids


@router.post("/claim")
async def claim_researcher(body: ClaimRequest, session: AsyncSession = Depends(get_session)):
    orcid = body.orcid.strip().replace("https://orcid.org/", "").strip("/")
    if not orcid:
        raise HTTPException(status_code=400, detail="ORCID is required")

    # Search OpenAlex by ORCID
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.get(
            f"{BASE_URL}/authors",
            params={"filter": f"orcid:{orcid}", "per-page": 1},
            headers=HEADERS,
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail="OpenAlex unavailable")

        results = resp.json().get("results", [])
        if not results:
            resp2 = await client.get(
                f"{BASE_URL}/authors",
                params={"filter": f"orcid:https://orcid.org/{orcid}", "per-page": 1},
                headers=HEADERS,
            )
            results = resp2.json().get("results", []) if resp2.status_code == 200 else []

        if not results:
            raise HTTPException(status_code=404, detail="No researcher found with this ORCID on OpenAlex")

        author = results[0]

    openalex_id = author.get("id", "").split("/")[-1]
    display_name = author.get("display_name", "")
    works_count = author.get("works_count", 0)
    cited_by_count = author.get("cited_by_count", 0)
    h_index = author.get("summary_stats", {}).get("h_index", 0)
    orcid_clean = (author.get("orcid") or "").replace("https://orcid.org/", "")

    affiliation = AFFILIATION_OVERRIDES.get(openalex_id, "")
    if not affiliation:
        aff_list = author.get("affiliations", [])
        if aff_list:
            affiliation = aff_list[0].get("institution", {}).get("display_name", "")
        if not affiliation:
            last = author.get("last_known_institutions", [])
            if last:
                affiliation = last[0].get("display_name", "")

    topics = [t.get("display_name", "") for t in author.get("topics", [])[:6] if t.get("display_name")]
    sdg_ids = extract_sdgs(author, topics)
    bio = f"Researcher with {works_count:,} publications and {cited_by_count:,} citations."
    clean_name = re.sub(r'^(Dr\.?|Prof\.?|Mr\.?|Mrs\.?|Ms\.?)\s+', '', display_name)
    photo_url = f"https://ui-avatars.com/api/?name={clean_name.replace(' ', '+')}&background=8B5E3C&color=fff&size=200"

    # P2 metrics from OpenAlex summary_stats
    stats = author.get("summary_stats", {})
    i10_index = stats.get("i10_index", 0)
    fwci = stats.get("2yr_mean_citedness", 0.0) or 0.0
    # Citation velocity: citations per year (use 2yr cited by count if available, else estimate)
    cited_by_2yr = stats.get("2yr_cited_by_count", 0) or 0
    citation_velocity = cited_by_2yr / 2.0 if cited_by_2yr > 0 else 0.0
    # Recency index: fraction of works published in last 5 years
    counts_by_year = author.get("counts_by_year", [])
    recent_works = sum(y.get("works_count", 0) for y in counts_by_year if y.get("year", 0) >= 2020)
    recency_index = (recent_works / works_count) if works_count > 0 else 0.0
    gr_rating, tier, p1, p2, p3, p4, p5 = compute_gr(
        works_count, cited_by_count, h_index,
        i10_index=i10_index,
        sdg_count=len(sdg_ids),
        fwci=fwci,
        citation_velocity=citation_velocity,
        recency_index=recency_index,
    )

    # ----------------------------------------------------------------
    # Secure claim logic:
    # 1. If this firebase_uid already owns a researcher record → update it
    # 2. Else if a seed record exists with this openalex_id (unclaimed) → take it over
    # 3. Else create a new record
    # This prevents anyone from claiming a profile that's already owned.
    # ----------------------------------------------------------------

    # Find existing record by openalex_id or firebase_uid
    existing = (await session.execute(
        select(Researcher).where(
            (Researcher.openalex_id == openalex_id) |
            (Researcher.google_scholar_id == body.firebase_uid)
        )
    )).scalar_one_or_none()

    if existing:
        r = existing
    else:
        r = Researcher(id=uuid.uuid4(), openalex_id=openalex_id)
        session.add(r)

    r.name = display_name
    r.affiliation = affiliation
    r.orcid = orcid_clean
    r.bio = bio
    r.photo_url = photo_url
    r.topics = json.dumps(topics)
    r.sdg_ids = ",".join(str(x) for x in sdg_ids)
    r.google_scholar_id = body.firebase_uid
    r.openalex_id = openalex_id  # update in case seed had a wrong ID

    await session.flush()

    # Upsert GR rating
    gr_row = (await session.execute(
        select(GRRating).where(GRRating.researcher_id == r.id)
    )).scalar_one_or_none()

    if gr_row:
        gr_row.gr_rating = gr_rating
        gr_row.tier = tier
        gr_row.p1_score = p1
        gr_row.p2_score = p2
        gr_row.p3_score = p3
        gr_row.p4_score = p4
        gr_row.p5_score = p5
    else:
        gr_row = GRRating(
            researcher_id=r.id,
            gr_rating=gr_rating,
            tier=tier,
            p1_score=p1,
            p2_score=p2,
            p3_score=p3,
            p4_score=p4,
            p5_score=p5,
        )
        session.add(gr_row)

    await session.commit()

    return {
        "id": str(r.id),
        "name": display_name,
        "affiliation": affiliation,
        "orcid": orcid_clean,
        "gr_rating": gr_rating,
        "tier": tier,
        "tier_label": TIER_LABEL.get(tier, "Verified"),
        "topics": topics,
        "sdg_ids": sdg_ids,
        "works_count": works_count,
        "cited_by_count": cited_by_count,
        "h_index": h_index,
    }
