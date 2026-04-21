"""OpenAlex API client for fetching author profiles and works."""
import asyncio
import httpx
from app.config import settings

BASE_URL = "https://api.openalex.org"
_semaphore = asyncio.Semaphore(10)  # max 10 concurrent requests


def _headers() -> dict:
    return {"User-Agent": f"GRConnect/1.0 (mailto:{settings.openalex_email})"}


async def _get(client: httpx.AsyncClient, url: str, params: dict | None = None) -> dict:
    """GET with semaphore, retry on 429/500."""
    async with _semaphore:
        for attempt in range(3):
            resp = await client.get(url, params=params, headers=_headers())
            if resp.status_code == 200:
                return resp.json()
            if resp.status_code in (429, 500, 503):
                await asyncio.sleep(2 ** attempt)
                continue
            resp.raise_for_status()
        raise RuntimeError(f"OpenAlex request failed after 3 retries: {url}")


async def fetch_author_profile(openalex_id: str) -> dict:
    """Fetch author summary: h-index, citations, works_count, i10-index."""
    async with httpx.AsyncClient(timeout=30) as client:
        data = await _get(client, f"{BASE_URL}/authors/{openalex_id}")
        stats = data.get("summary_stats", {})
        return {
            "name": data.get("display_name", ""),
            "affiliation": (
                data.get("last_known_institutions", [{}])[0].get("display_name", "")
                if data.get("last_known_institutions")
                else ""
            ),
            "h_index": stats.get("h_index", 0),
            "total_citations": data.get("cited_by_count", 0),
            "works_count": data.get("works_count", 0),
            "i10_index": stats.get("i10_index", 0),
            "orcid": data.get("orcid", ""),
        }


async def fetch_author_works(openalex_id: str) -> list[dict]:
    """Fetch all works for an author using cursor pagination."""
    works = []
    cursor = "*"
    async with httpx.AsyncClient(timeout=30) as client:
        while cursor:
            params = {
                "filter": f"authorships.author.id:{openalex_id}",
                "select": (
                    "id,doi,cited_by_count,publication_year,"
                    "concepts,topics,sustainable_development_goals,"
                    "open_access,type,authorships,funders,fwci"
                ),
                "per_page": 200,
                "cursor": cursor,
            }
            data = await _get(client, f"{BASE_URL}/works", params)
            results = data.get("results", [])
            if not results:
                break
            works.extend(results)
            cursor = data.get("meta", {}).get("next_cursor")
    return works
