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
EMAIL = "ayushwalunj1@gmail.com"
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


def compute_gr(works_count: int, cited_by_count: int, h_index: int):
    pub_score = min(works_count / 500 * 100, 100)
    cite_score = min(cited_by_count / 20000 * 100, 100)
    h_score = min(h_index / 80 * 100, 100)
    gr = round(pub_score * 0.25 + cite_score * 0.45 + h_score * 0.30, 1)
    if gr >= 80: tier = "GR-A"
    elif gr >= 60: tier = "GR-B"
    elif gr >= 40: tier = "GR-C"
    elif gr >= 20: tier = "GR-D"
    else: tier = "GR-E"
    return gr, tier


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
            # Try searching by ORCID URL format
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

    affiliation = ""
    aff_list = author.get("affiliations", [])
    if aff_list:
        affiliation = aff_list[0].get("institution", {}).get("display_name", "")
    if not affiliation:
        last = author.get("last_known_institutions", [])
        if last:
            affiliation = last[0].get("display_name", "")

    topics = [t.get("display_name", "") for t in author.get("topics", [])[:6] if t.get("display_name")]
    sdg_ids = extract_sdgs(author, topics)
    bio = f"Researcher with {works_count} publications and {cited_by_count} citations."
    clean_name = re.sub(r'^(Dr\.?|Prof\.?|Mr\.?|Mrs\.?|Ms\.?)\s+', '', display_name)
    photo_url = f"https://ui-avatars.com/api/?name={clean_name.replace(' ', '+')}&background=8B5E3C&color=fff&size=200"
    gr_rating, tier = compute_gr(works_count, cited_by_count, h_index)

    # Check if researcher already exists by openalex_id or firebase_uid
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
    r.google_scholar_id = body.firebase_uid  # reuse field to store firebase UID

    await session.flush()

    # Upsert GR rating
    p1 = min(works_count / 500 * 100, 100)
    p2 = min(cited_by_count / 20000 * 100, 100)
    p3 = min(h_index / 80 * 100, 100)

    gr_row = (await session.execute(
        select(GRRating).where(GRRating.researcher_id == r.id)
    )).scalar_one_or_none()

    if gr_row:
        gr_row.gr_rating = gr_rating
        gr_row.tier = tier
        gr_row.p1_score = p1
        gr_row.p2_score = p2
        gr_row.p3_score = p3
        gr_row.p4_score = 50.0
        gr_row.p5_score = 50.0
    else:
        gr_row = GRRating(
            researcher_id=r.id,
            gr_rating=gr_rating,
            tier=tier,
            p1_score=p1,
            p2_score=p2,
            p3_score=p3,
            p4_score=50.0,
            p5_score=50.0,
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
