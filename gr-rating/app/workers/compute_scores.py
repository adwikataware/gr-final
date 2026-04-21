"""Celery tasks for computing researcher scores."""
import asyncio
import uuid
import logging

from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


def _run_async(coro):
    """Run an async coroutine from sync Celery task."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                return pool.submit(asyncio.run, coro).result()
        return loop.run_until_complete(coro)
    except RuntimeError:
        return asyncio.run(coro)


async def _compute_full_profile_async(researcher_id: str) -> dict:
    """Full pipeline: fetch from OpenAlex -> compute scores -> store in DB + Redis."""
    from sqlalchemy import select
    from app.database import async_session
    from app.models.researcher import Researcher
    from app.models.raw_metrics import RawMetrics
    from app.models.gr_rating import GRRating
    from app.ingestion.openalex import fetch_author_profile, fetch_author_works
    from app.ingestion.fwci import compute_researcher_fwci
    from app.ingestion.metrics import (
        compute_p2_raw_metrics,
        compute_p3_raw_metrics,
        compute_p4_book_metrics,
    )
    from app.ingestion.crossref_events import fetch_societal_mentions
    from app.scoring.pillar1 import pillar1_score
    from app.scoring.pillar2 import pillar2_score
    from app.scoring.pillar3 import pillar3_score
    from app.scoring.pillar4 import pillar4_score
    from app.scoring.pillar5 import pillar5_score
    from app.scoring.composite import compute_gr_rating
    from app.cache import cache_gr_rating, invalidate_rating

    rid = uuid.UUID(researcher_id)

    async with async_session() as session:
        researcher = await session.get(Researcher, rid)
        if not researcher:
            raise ValueError(f"Researcher {researcher_id} not found")

        if not researcher.openalex_id:
            raise ValueError(f"Researcher {researcher_id} has no OpenAlex ID")

        logger.info(f"Computing profile for {researcher.name} ({researcher.openalex_id})")

        # 1. Fetch from OpenAlex
        profile = await fetch_author_profile(researcher.openalex_id)
        works = await fetch_author_works(researcher.openalex_id)

        # 2. Compute FWCI
        fwci = await compute_researcher_fwci(works)

        # 3. Extract raw metrics
        p2_metrics = compute_p2_raw_metrics(works)
        p3_metrics = compute_p3_raw_metrics(works)
        p4_metrics = compute_p4_book_metrics(works)

        # 4. Fetch societal mentions (DOIs from top-cited works)
        dois = [
            w["doi"] for w in sorted(works, key=lambda x: x.get("cited_by_count", 0), reverse=True)
            if w.get("doi")
        ]
        societal_mentions = await fetch_societal_mentions(dois)

        # 5. Update researcher profile
        researcher.name = profile["name"] or researcher.name
        researcher.affiliation = profile["affiliation"] or researcher.affiliation

        # 6. Store raw metrics
        existing_metrics = await session.get(RawMetrics, rid)
        metrics_data = {
            "researcher_id": rid,
            "h_index": profile["h_index"],
            "total_citations": profile["total_citations"],
            "publications": profile["works_count"],
            "i10_index": profile["i10_index"],
            "fwci": fwci,
            "citation_velocity": p2_metrics["citation_velocity"],
            "recency_index": p2_metrics["recency_index"],
            "active_years": p2_metrics["active_years"],
            "topic_prominence_cagr": p2_metrics["topic_prominence_cagr"],
            "sdg_count": p3_metrics["sdg_count"],
            "sdg_mean_confidence": p3_metrics["sdg_mean_confidence"],
            "oa_percentage": p3_metrics["oa_percentage"],
            "societal_mentions": societal_mentions,
            "total_patents": 0,  # Needs Lens API (post-MVP)
            "books_authored": p4_metrics["books_authored"],
            "books_edited": p4_metrics["books_edited"],
            "unique_funders": p4_metrics["unique_funders"],
            "patent_links": 0,  # Needs Lens API (post-MVP)
        }

        if existing_metrics:
            for k, v in metrics_data.items():
                if k != "researcher_id":
                    setattr(existing_metrics, k, v)
        else:
            session.add(RawMetrics(**metrics_data))

        # 7. Compute pillar scores
        p1 = pillar1_score(
            profile["h_index"], profile["total_citations"],
            profile["works_count"], profile["i10_index"],
        )
        p2 = pillar2_score(
            fwci, p2_metrics["citation_velocity"],
            p2_metrics["recency_index"], p2_metrics["topic_prominence_cagr"],
            p2_metrics["active_years"],
        )
        p3 = pillar3_score(
            p3_metrics["sdg_count"], p3_metrics["sdg_mean_confidence"],
            p3_metrics["oa_percentage"], societal_mentions,
        )
        p4 = pillar4_score(
            0, p4_metrics["books_authored"],
            p4_metrics["books_edited"], p4_metrics["unique_funders"], 0,
        )
        p5 = pillar5_score()
        gr = compute_gr_rating(
            p1["p1_score"], p2["p2_score"], p3["p3_score"],
            p4["p4_score"], p5["p5_score"],
        )

        # 8. Store GR Rating
        existing_rating = await session.get(GRRating, rid)
        rating_data = {
            "researcher_id": rid,
            "p1_score": p1["p1_score"],
            "p2_score": p2["p2_score"],
            "p3_score": p3["p3_score"],
            "p4_score": p4["p4_score"],
            "p5_score": p5["p5_score"],
            "gr_rating": gr["gr_rating"],
            "tier": gr["tier"],
        }

        if existing_rating:
            for k, v in rating_data.items():
                if k != "researcher_id":
                    setattr(existing_rating, k, v)
        else:
            session.add(GRRating(**rating_data))

        await session.commit()

        # 9. Cache in Redis
        await invalidate_rating(rid)
        cache_data = {
            "researcher_id": str(rid),
            "name": researcher.name,
            "affiliation": researcher.affiliation,
            "gr_rating": gr["gr_rating"],
            "tier": gr["tier"],
            "tier_label": gr["tier_label"],
            "pillars": {
                "p1": {"score": p1["p1_score"], "label": "Core Research", "weight": 0.25},
                "p2": {"score": p2["p2_score"], "label": "Performance", "weight": 0.30},
                "p3": {"score": p3["p3_score"], "label": "Societal Impact", "weight": 0.15},
                "p4": {"score": p4["p4_score"], "label": "Innovation", "weight": 0.20},
                "p5": {"score": p5["p5_score"], "label": "Community", "weight": 0.10},
            },
        }
        await cache_gr_rating(rid, cache_data)

        # 10. Sync to Meilisearch
        from app.search import sync_researcher_to_search
        await sync_researcher_to_search(
            researcher_id=str(rid),
            name=researcher.name,
            affiliation=researcher.affiliation,
            gr_rating=gr["gr_rating"],
            tier=gr["tier"],
        )

        logger.info(
            f"Computed {researcher.name}: GR={gr['gr_rating']} ({gr['tier']})"
        )

        return {
            "researcher_id": str(rid),
            "name": researcher.name,
            "gr_rating": gr["gr_rating"],
            "tier": gr["tier"],
        }


@celery_app.task(name="app.workers.compute_scores.compute_full_profile", bind=True, max_retries=3)
def compute_full_profile(self, researcher_id: str) -> dict:
    """Compute full profile for a researcher (Celery task)."""
    try:
        return _run_async(_compute_full_profile_async(researcher_id))
    except Exception as exc:
        logger.error(f"Failed to compute profile for {researcher_id}: {exc}")
        raise self.retry(exc=exc, countdown=60)


@celery_app.task(name="app.workers.compute_scores.refresh_researcher")
def refresh_researcher(researcher_id: str) -> dict:
    """Invalidate cache and recompute a researcher's profile."""
    _run_async(_invalidate_and_recompute(researcher_id))
    return {"status": "refreshed", "researcher_id": researcher_id}


async def _invalidate_and_recompute(researcher_id: str):
    from app.cache import invalidate_rating
    await invalidate_rating(uuid.UUID(researcher_id))


@celery_app.task(name="app.workers.compute_scores.batch_refresh_all")
def batch_refresh_all() -> dict:
    """Refresh all researchers with staggered delays."""
    return _run_async(_batch_refresh_all_async())


async def _batch_refresh_all_async() -> dict:
    from sqlalchemy import select
    from app.database import async_session
    from app.models.researcher import Researcher

    async with async_session() as session:
        result = await session.execute(select(Researcher.id))
        ids = [str(r[0]) for r in result.all()]

    for rid in ids:
        compute_full_profile.delay(rid)
        await asyncio.sleep(1)  # 1s stagger to avoid rate limits

    logger.info(f"Queued {len(ids)} researchers for refresh")
    return {"queued": len(ids)}


@celery_app.task(name="app.workers.compute_scores.weekly_fwci_cache_clear")
def weekly_fwci_cache_clear() -> dict:
    """Clear FWCI field average cache, then trigger full refresh."""
    return _run_async(_clear_fwci_cache())


async def _clear_fwci_cache() -> dict:
    from app.cache import redis_client
    from app.ingestion.fwci import FIELD_AVG_PREFIX

    cursor = "0"
    deleted = 0
    while cursor:
        cursor, keys = await redis_client.scan(
            cursor=int(cursor), match=f"{FIELD_AVG_PREFIX}*", count=100
        )
        if keys:
            await redis_client.delete(*keys)
            deleted += len(keys)

    logger.info(f"Cleared {deleted} FWCI cache entries")

    # Trigger full refresh after cache clear
    batch_refresh_all.delay()

    return {"cleared": deleted}
