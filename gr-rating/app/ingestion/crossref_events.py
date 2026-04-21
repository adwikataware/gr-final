"""Crossref Event Data API — fetch societal mentions (Wikipedia, news, policy docs)."""
import asyncio
import httpx
from app.config import settings

BASE_URL = "https://api.eventdata.crossref.org/v1/events"
_semaphore = asyncio.Semaphore(5)  # max 5 concurrent requests


async def _fetch_events_for_doi(client: httpx.AsyncClient, doi: str) -> int:
    """Fetch event count for a single DOI."""
    async with _semaphore:
        try:
            params = {
                "mailto": settings.openalex_email,
                "obj-id": doi,
                "rows": 0,  # We only need the count
            }
            resp = await client.get(BASE_URL, params=params, timeout=15)
            if resp.status_code == 200:
                data = resp.json()
                return data.get("message", {}).get("total-results", 0)
        except Exception:
            pass
        return 0


async def fetch_societal_mentions(dois: list[str], max_dois: int = 50) -> int:
    """Fetch total societal mentions for a list of DOIs.

    Limits to max_dois most-cited papers to avoid rate limiting.
    """
    if not dois:
        return 0

    # Sample the first max_dois DOIs (caller should sort by citation count)
    sample = dois[:max_dois]

    async with httpx.AsyncClient() as client:
        tasks = [_fetch_events_for_doi(client, doi) for doi in sample]
        results = await asyncio.gather(*tasks)

    return sum(results)
