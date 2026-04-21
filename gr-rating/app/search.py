"""Meilisearch integration for fast fuzzy researcher search."""
import logging
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

INDEX_NAME = "researchers"
_BASE = settings.meilisearch_url


def _headers() -> dict:
    h = {"Content-Type": "application/json"}
    if settings.meilisearch_api_key:
        h["Authorization"] = f"Bearer {settings.meilisearch_api_key}"
    return h


async def ensure_index():
    """Create the researchers index and configure it."""
    async with httpx.AsyncClient(timeout=10) as client:
        # Create index
        await client.post(
            f"{_BASE}/indexes",
            json={"uid": INDEX_NAME, "primaryKey": "id"},
            headers=_headers(),
        )
        # Configure searchable/filterable/sortable attributes
        base_url = f"{_BASE}/indexes/{INDEX_NAME}/settings"
        await client.put(
            f"{base_url}/searchable-attributes",
            json=["name", "affiliation"],
            headers=_headers(),
        )
        await client.put(
            f"{base_url}/filterable-attributes",
            json=["tier", "gr_rating"],
            headers=_headers(),
        )
        await client.put(
            f"{base_url}/sortable-attributes",
            json=["gr_rating", "name"],
            headers=_headers(),
        )


async def sync_researcher_to_search(
    researcher_id: str,
    name: str,
    affiliation: str,
    gr_rating: float | None = None,
    tier: str | None = None,
) -> None:
    """Index or update a researcher in Meilisearch."""
    doc = {
        "id": researcher_id,
        "name": name,
        "affiliation": affiliation or "",
        "gr_rating": gr_rating,
        "tier": tier,
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(
                f"{_BASE}/indexes/{INDEX_NAME}/documents",
                json=[doc],
                headers=_headers(),
            )
    except Exception as e:
        logger.warning(f"Meilisearch sync failed for {researcher_id}: {e}")


async def search_researchers(query: str, limit: int = 10) -> list[dict]:
    """Search researchers by name or affiliation."""
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.post(
                f"{_BASE}/indexes/{INDEX_NAME}/search",
                json={"q": query, "limit": limit},
                headers=_headers(),
            )
            if resp.status_code == 200:
                return resp.json().get("hits", [])
    except Exception as e:
        logger.warning(f"Meilisearch search failed: {e}")
    return []


async def sync_all_researchers() -> int:
    """Sync all researchers from DB to Meilisearch."""
    from sqlalchemy import select
    from app.database import async_session
    from app.models.researcher import Researcher
    from app.models.gr_rating import GRRating

    await ensure_index()

    async with async_session() as session:
        stmt = (
            select(Researcher, GRRating)
            .outerjoin(GRRating, Researcher.id == GRRating.researcher_id)
        )
        results = (await session.execute(stmt)).all()

    docs = []
    for r, gr in results:
        docs.append({
            "id": str(r.id),
            "name": r.name,
            "affiliation": r.affiliation or "",
            "gr_rating": gr.gr_rating if gr else None,
            "tier": gr.tier if gr else None,
        })

    if docs:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                await client.post(
                    f"{_BASE}/indexes/{INDEX_NAME}/documents",
                    json=docs,
                    headers=_headers(),
                )
        except Exception as e:
            logger.warning(f"Meilisearch bulk sync failed: {e}")
            return 0

    return len(docs)
