"""FWCI (Field-Weighted Citation Impact) computation.

OpenAlex provides per-work FWCI directly. We use that when available,
falling back to manual computation via cached field averages.
"""
import asyncio
import json
import httpx
from app.config import settings
from app.cache import redis_client

FIELD_AVG_PREFIX = "fwci:field_avg:"
FIELD_AVG_TTL = 604800  # 7 days


def _headers() -> dict:
    return {"User-Agent": f"GRConnect/1.0 (mailto:{settings.openalex_email})"}


async def get_field_average(concept_id: str, year: int) -> float | None:
    """Get average citations for a concept+year, cached in Redis."""
    key = f"{FIELD_AVG_PREFIX}{concept_id}:{year}"

    cached = await redis_client.get(key)
    if cached:
        data = json.loads(cached)
        return data.get("mean_citations")

    url = "https://api.openalex.org/works"
    params = {
        "filter": f"concepts.id:{concept_id},publication_year:{year}",
        "select": "cited_by_count",
        "per_page": 200,
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(url, params=params, headers=_headers())
            if resp.status_code != 200:
                return None
            data = resp.json()
            results = data.get("results", [])
            if not results:
                return None

            sample_sum = sum(w.get("cited_by_count", 0) for w in results)
            mean = sample_sum / len(results) if results else 1.0

            cache_data = {"mean_citations": mean, "n_works": len(results)}
            await redis_client.set(key, json.dumps(cache_data), ex=FIELD_AVG_TTL)
            return mean
    except Exception:
        return None


async def compute_researcher_fwci(works: list[dict]) -> float:
    """Compute mean FWCI across all works.

    Uses OpenAlex's native FWCI field when available.
    Falls back to manual computation via field averages.
    Returns 1.0 (field average) if insufficient data.
    """
    # Try native FWCI first (OpenAlex provides this)
    native_fwcis = [w["fwci"] for w in works if w.get("fwci") is not None]
    if len(native_fwcis) >= len(works) * 0.5:  # If >=50% of works have FWCI
        return sum(native_fwcis) / len(native_fwcis)

    # Fallback: manual computation
    fwcis = list(native_fwcis)  # Start with what we have

    tasks = []
    work_info = []
    for w in works:
        if w.get("fwci") is not None:
            continue  # Already counted
        concepts = w.get("concepts", [])
        year = w.get("publication_year")
        citations = w.get("cited_by_count", 0)
        if not concepts or not year:
            continue
        best = max(concepts, key=lambda c: c.get("score", 0))
        concept_id = best.get("id")
        if concept_id:
            work_info.append(citations)
            tasks.append(get_field_average(concept_id, year))

    if tasks:
        field_avgs = await asyncio.gather(*tasks)
        for citations, field_avg in zip(work_info, field_avgs):
            if field_avg and field_avg > 0:
                fwcis.append(citations / field_avg)

    if not fwcis:
        return 1.0

    return sum(fwcis) / len(fwcis)
