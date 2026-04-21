# GR Rating — Implementation Plan for Claude Code

## READ THIS FIRST
This file contains the step-by-step build plan for the GR Rating backend.
- **CLAUDE.md** → project context, constants, architecture (read automatically)
- **GR_Rating_Implementation_Spec.docx** → formulas, schemas, API specs, code (reference document)
- **This file (IMPLEMENTATION_PLAN.md)** → what to build, in what order, with exact instructions

Work through each phase sequentially. Do NOT skip ahead. Each phase should be fully tested before moving to the next.

---

## Phase 1: Project Scaffold
**Goal:** Empty but runnable FastAPI project with Docker infrastructure.

### Do this:
1. Initialize a Python project with `pyproject.toml` (use Python 3.11+)
2. Install dependencies: fastapi, uvicorn, sqlalchemy[asyncio], asyncpg, alembic, redis, celery, httpx, pydantic>=2.0, pytest, pytest-asyncio
3. Create `docker-compose.yml` with:
   - PostgreSQL 15 (port 5432, db: gr_rating, user: gruser, password: grpass)
   - Redis 7 (port 6379)
4. Create `.env.example` with all env vars:
   ```
   DATABASE_URL=postgresql+asyncpg://gruser:grpass@localhost:5432/gr_rating
   REDIS_URL=redis://localhost:6379/0
   CELERY_BROKER_URL=redis://localhost:6379/1
   OPENALEX_EMAIL=your-email@example.com
   ```
5. Create the project directory structure (see CLAUDE.md for full tree):
   - app/ with __init__.py, main.py, config.py, database.py
   - app/models/, app/schemas/, app/scoring/, app/ingestion/, app/workers/, app/api/v1/
   - tests/test_scoring/, tests/test_ingestion/, tests/test_api/
   - scripts/, alembic/
6. Set up `app/config.py` — read all env vars using pydantic BaseSettings
7. Set up `app/database.py` — SQLAlchemy async engine + async session maker
8. Set up `app/main.py` — minimal FastAPI app with a GET /api/v1/health endpoint that returns {"status": "ok"}
9. Run: `docker compose up -d`, then `uvicorn app.main:app --reload`
10. Verify: `curl localhost:8000/api/v1/health` returns 200

### Test:
- Health endpoint returns 200
- PostgreSQL and Redis containers are running

---

## Phase 2: Scoring Engine (THE MOST IMPORTANT PHASE)
**Goal:** Pure Python scoring functions with zero external dependencies. All formulas from the spec.

### Do this:
1. Create `app/scoring/saturation.py`:
   ```python
   def saturation_score(x: float, c: float) -> float:
       v = max(x, 0.0)
       return 100.0 * v / (v + c) if (v + c) > 0 else 0.0
   ```

2. Create `app/scoring/pillar1.py` — Core Fundamental Research (weight: 0.25):
   - c-values: h_index=3, citations=180, publications=8, i10=3
   - Sub-weights: h=0.30, citations=0.25, publications=0.25, i10=0.20
   - Function: `pillar1_score(h_index, total_citations, publications, i10_index) -> dict`
   - Returns: s_h, s_citations, s_publications, s_i10, p1_score

3. Create `app/scoring/pillar2.py` — Performance Analytics (weight: 0.30):
   - c-values: fwci=0.3, velocity=12, recency=0.3, topic=3
   - Sub-weights: fwci=0.35, velocity=0.25, recency=0.20, topic=0.20
   - Edge case: if active_years < 5, set recency_index = 1.0
   - All inputs floored at 0 via max(x, 0)

4. Create `app/scoring/pillar3.py` — Societal Impact (weight: 0.15):
   - c-values: sdg=1.5, sdg_strength=0.18, oa=10, societal=4
   - All equal weights: 0.25 each

5. Create `app/scoring/pillar4.py` — Innovation (weight: 0.20):
   - c-values: patents=2.5, books=2, funders=1.2, patent_links=2
   - Sub-weights: patents=0.30, books=0.25, funders=0.25, links=0.20
   - Books formula: b = books_authored + (0.5 * books_edited)
   - Patents: single total count, no filed/granted split

6. Create `app/scoring/pillar5.py`:
   ```python
   def pillar5_score() -> dict:
       return {"p5_score": 50.0}
   ```

7. Create `app/scoring/composite.py`:
   - Weights: p1=0.25, p2=0.30, p3=0.15, p4=0.20, p5=0.10
   - `compute_gr_rating(p1, p2, p3, p4, p5=50.0) -> dict`
   - Include tier classification: GR-A(85+), GR-B(70+), GR-C(50+), GR-D(30+), GR-E(<30)

### Test (CRITICAL — these must all pass before moving on):
```python
# saturation_score
assert saturation_score(0, 3) == 0.0
assert saturation_score(3, 3) == 50.0
assert saturation_score(1000000, 3) < 100.0
assert saturation_score(-5, 3) == 0.0

# Dr. Mahalle — must score 84.4 ± 0.5
mahalle_p1 = pillar1_score(h_index=29, total_citations=4715, publications=440, i10_index=75)
assert 94.5 <= mahalle_p1["p1_score"] <= 95.5  # expect ~95.1

mahalle_p2 = pillar2_score(fwci=1.6, citation_velocity=188, recency_index=1.3, topic_prominence_cagr=25)
assert 86.5 <= mahalle_p2["p2_score"] <= 87.5  # expect ~87.1

mahalle_p3 = pillar3_score(sdg_count=5, sdg_mean_confidence=0.55, oa_percentage=35, societal_mentions=12)
assert 75.5 <= mahalle_p3["p3_score"] <= 77.0  # expect ~76.3

mahalle_p4 = pillar4_score(total_patents=117, books_authored=15, books_edited=60, unique_funders=5, patent_links=10)
assert 89.5 <= mahalle_p4["p4_score"] <= 91.0  # expect ~90.3

mahalle_gr = compute_gr_rating(mahalle_p1["p1_score"], mahalle_p2["p2_score"], mahalle_p3["p3_score"], mahalle_p4["p4_score"])
assert 83.9 <= mahalle_gr["gr_rating"] <= 84.9  # expect 84.4
assert mahalle_gr["tier"] == "GR-B"

# Dr. Guo — must be GR-A (87+)
guo_p1 = pillar1_score(h_index=130, total_citations=115000, publications=1327, i10_index=900)
guo_p2 = pillar2_score(fwci=3.5, citation_velocity=4600, recency_index=1.2, topic_prominence_cagr=22)
guo_p3 = pillar3_score(sdg_count=6, sdg_mean_confidence=0.6, oa_percentage=45, societal_mentions=120)
guo_p4 = pillar4_score(total_patents=23, books_authored=5, books_edited=20, unique_funders=12, patent_links=25)
guo_gr = compute_gr_rating(guo_p1["p1_score"], guo_p2["p2_score"], guo_p3["p3_score"], guo_p4["p4_score"])
assert guo_gr["gr_rating"] >= 85
assert guo_gr["tier"] == "GR-A"

# Dr. Salve — must be GR-D (40-45)
salve_p1 = pillar1_score(h_index=4, total_citations=49, publications=15, i10_index=2)
salve_p2 = pillar2_score(fwci=0.5, citation_velocity=10, recency_index=0.6, topic_prominence_cagr=20)
salve_p3 = pillar3_score(sdg_count=1, sdg_mean_confidence=0.42, oa_percentage=20, societal_mentions=0)
salve_p4 = pillar4_score(total_patents=0, books_authored=0, books_edited=0, unique_funders=0, patent_links=0)
salve_gr = compute_gr_rating(salve_p1["p1_score"], salve_p2["p2_score"], salve_p3["p3_score"], salve_p4["p4_score"])
assert 40 <= salve_gr["gr_rating"] <= 45
assert salve_gr["tier"] == "GR-D"
```

Run `pytest tests/test_scoring/ -v` and ensure ALL pass before Phase 3.

---

## Phase 3: Database Models & Migrations
**Goal:** PostgreSQL tables for researchers, raw metrics, and computed ratings.

### Do this:
1. Create `app/models/researcher.py` — researchers table:
   - id (UUID, PK), name, affiliation, openalex_id (unique), semantic_scholar_id, orcid, google_scholar_id, created_at, updated_at

2. Create `app/models/raw_metrics.py` — raw_metrics table:
   - researcher_id (FK, PK), all raw metric fields for P1-P4, fetched_at, source

3. Create `app/models/gr_rating.py` — gr_ratings table:
   - researcher_id (FK, PK), p1_score through p5_score, gr_rating, tier, rank_overall, computed_at
   - Indexes: gr_rating DESC, tier

4. Set up Alembic: `alembic init alembic`, configure alembic.ini with DATABASE_URL
5. Generate migration: `alembic revision --autogenerate -m "initial tables"`
6. Apply: `alembic upgrade head`

### Test:
- `alembic upgrade head` runs without errors
- Tables exist in PostgreSQL
- Can insert and query a researcher record

---

## Phase 4: API Endpoints
**Goal:** RESTful API serving GR Ratings from the database.

### Do this:
1. Create Pydantic response schemas in `app/schemas/rating.py`:
   - ResearcherRatingResponse (full rating with pillar breakdown)
   - ResearcherSearchResult (name, affiliation, score, tier)
   - ResearcherListResponse (paginated list)

2. Create route handlers in `app/api/v1/`:
   - GET /api/v1/researchers/{id}/rating → serve from DB, return full pillar breakdown
   - GET /api/v1/researchers/{id}/rating/detailed → sub-metric level scores
   - GET /api/v1/researchers/search?q={query} → search by name/affiliation (PostgreSQL LIKE for now, Meilisearch later)
   - GET /api/v1/researchers/top?limit=20&offset=0&tier=GR-B&sort=gr_rating → paginated top researchers
   - POST /api/v1/researchers/{id}/refresh → return 202, will trigger Celery task in Phase 6

3. Important: if a researcher has no computed score, return 202 with:
   ```json
   {"status": "computing", "message": "GR Rating is being computed. Please retry in 30 seconds."}
   ```

### Test:
- Seed a researcher manually, compute scores using Phase 2 functions, insert into gr_ratings
- GET /rating returns 200 with correct scores
- GET /rating for unknown researcher returns 404
- GET /top returns paginated list sorted by score
- Search returns matching researchers

---

## Phase 5: Seed Script & Validation
**Goal:** Load 10 calibrated researchers and verify end-to-end scoring.

### Do this:
1. Create `scripts/seed_researchers.py` that:
   - Inserts 10 test researchers (see calibration data below)
   - Computes all pillar scores using the scoring module
   - Stores raw_metrics and gr_ratings in PostgreSQL
   - Prints a summary table: name, P1, P2, P3, P4, GR, Tier

2. Calibration data to seed (at minimum these 10):

| Name | h | Cites | Pubs | i10 | FWCI | Vel | Rec | TopCAGR | SDGs | SDGstr | OA% | Soc | Patents | BooksAuth | BooksEdit | Funders | PatLinks |
|------|---|-------|------|-----|------|-----|-----|---------|------|--------|-----|-----|---------|-----------|-----------|---------|----------|
| Dr. Zhanhu Guo | 130 | 115000 | 1327 | 900 | 3.5 | 4600 | 1.2 | 22 | 6 | 0.6 | 45 | 120 | 23 | 5 | 20 | 12 | 25 |
| Dr. Ketan Kotecha | 55 | 16000 | 500 | 200 | 3.2 | 640 | 1.5 | 35 | 5 | 0.55 | 55 | 30 | 22 | 5 | 3 | 8 | 12 |
| Dr. Ganapati Yadav | 70 | 20559 | 550 | 300 | 2.5 | 570 | 0.8 | 12 | 8 | 0.7 | 30 | 60 | 50 | 8 | 10 | 10 | 20 |
| Dr. Nilanjan Dey | 72 | 27491 | 800 | 380 | 2.8 | 1100 | 1.1 | 30 | 6 | 0.6 | 50 | 45 | 5 | 10 | 30 | 6 | 8 |
| Dr. Parikshit Mahalle | 29 | 4715 | 440 | 75 | 1.6 | 188 | 1.3 | 25 | 5 | 0.55 | 35 | 12 | 117 | 15 | 60 | 5 | 10 |
| Dr. Jagdish C. Bansal | 34 | 5768 | 183 | 65 | 2.2 | 384 | 1.0 | 18 | 3 | 0.5 | 40 | 8 | 0 | 2 | 10 | 4 | 3 |
| Dr. Gitanjali Shinde | 17 | 1166 | 113 | 25 | 1.4 | 145 | 1.6 | 25 | 4 | 0.5 | 30 | 5 | 2 | 3 | 5 | 2 | 1 |
| Dr. Vijay S. Rathore | 13 | 616 | 94 | 16 | 0.8 | 30 | 0.9 | 12 | 2 | 0.42 | 20 | 2 | 0 | 5 | 5 | 2 | 0 |
| Dr. Dattatray Takale | 13 | 688 | 100 | 15 | 1.0 | 57 | 1.4 | 25 | 3 | 0.48 | 30 | 3 | 80 | 2 | 5 | 2 | 2 |
| Dr. Sushilkumar Salve | 4 | 49 | 15 | 2 | 0.5 | 10 | 0.6 | 20 | 1 | 0.42 | 20 | 0 | 0 | 0 | 0 | 0 | 0 |

3. Run the seed script and verify:
   - Dr. Mahalle scores 84.4 ± 0.5 (GR-B)
   - Dr. Guo scores 87+ (GR-A)
   - Dr. Salve scores 40-45 (GR-D)
   - All 10 researchers have scores in the database
   - GET /api/v1/researchers/top returns all 10 sorted correctly

### Test:
- Run seed script without errors
- All API endpoints return correct data for seeded researchers

---

## Phase 6: Redis Caching
**Goal:** Cache-first architecture for sub-100ms score responses.

### Do this:
1. Create `app/cache.py` with async Redis client (redis.asyncio):
   - `cache_gr_rating(researcher_id, rating_dict, ttl=86400)` — stores JSON at key gr:rating:{id}
   - `get_cached_rating(researcher_id)` — returns parsed dict or None
   - `invalidate_rating(researcher_id)` — deletes the cache key

2. Update GET /api/v1/researchers/{id}/rating:
   - Check Redis first → if hit, return immediately
   - If miss, check PostgreSQL → if found, cache it, return it
   - If not found anywhere, return 202

3. Update the seed script to also cache all ratings in Redis after computing

### Test:
- First request hits DB, subsequent requests hit cache (verify with timing)
- Cache invalidation works
- 202 returned for unknown researchers

---

## Phase 7: OpenAlex Ingestion
**Goal:** Fetch real researcher data from OpenAlex API.

### Do this:
1. Create `app/ingestion/openalex.py`:
   - Async httpx client with User-Agent containing OPENALEX_EMAIL
   - `fetch_author_profile(openalex_id)` → h_index, cited_by_count, works_count, i10_index
   - `fetch_author_works(openalex_id)` → paginate with cursor, return all works
   - Rate limit: asyncio.Semaphore(10) — max 10 concurrent requests
   - Retry: 3 attempts with exponential backoff on 429/500

2. Create `app/ingestion/fwci.py`:
   - `get_field_average(concept_id, year)` — Redis-cached field averages (TTL 7 days)
   - `compute_researcher_fwci(works)` — mean of per-paper FWCIs
   - Use primary concept (highest score) per paper

3. Create `app/ingestion/metrics.py`:
   - `compute_p2_raw_metrics(works)` → citation_velocity, recency_index, active_years, topic_prominence
   - `compute_p3_raw_metrics(works)` → sdg_count, sdg_confidence, oa_percentage
   - `compute_p4_book_metrics(works)` → books_authored, books_edited, unique_funders

4. Create `app/ingestion/crossref_events.py`:
   - `fetch_societal_mentions(dois)` → total unique events from Crossref Event Data
   - Rate limit: 5 concurrent requests

### Test:
- Fetch data for a known OpenAlex author (test with a real ID)
- FWCI computation returns reasonable values (0.5–5.0 range)
- SDG extraction works on real OpenAlex work responses

---

## Phase 8: Celery Workers
**Goal:** Background computation pipeline.

### Do this:
1. Create `app/workers/celery_app.py` — Celery config with Redis broker
2. Create `app/workers/compute_scores.py`:
   - `compute_full_profile(researcher_id)` task:
     1. Look up researcher's openalex_id
     2. Fetch author profile + all works from OpenAlex
     3. Compute FWCI
     4. Extract all raw metrics (P1-P4)
     5. Compute all pillar scores
     6. Compute composite GR Rating
     7. Store in raw_metrics + gr_ratings tables
     8. Cache in Redis
   - `refresh_researcher(researcher_id)` — invalidate cache, recompute
   - `batch_refresh_all()` — refresh all researchers with 1s delay

3. Configure Celery Beat schedules:
   - Nightly at 2 AM IST: batch_refresh_all
   - Weekly Sunday 3 AM IST: additionally clear FWCI field average cache

4. Update POST /api/v1/researchers/{id}/refresh to queue Celery task

### Test:
- Trigger compute_full_profile for a seeded researcher
- Verify score appears in DB and Redis
- Trigger refresh and verify score updates

---

## Phase 9: Meilisearch
**Goal:** Fast fuzzy search for researcher discovery.

### Do this:
1. Add Meilisearch to docker-compose.yml (getmeili/meilisearch:v1.6, port 7700)
2. Create `app/search.py`:
   - `sync_researcher_to_search(researcher)` — index document
   - `search_researchers(query, limit=5)` — search and return results
3. Update compute pipeline to sync after scoring
4. Update GET /search to use Meilisearch

### Test:
- Search "Mahalle" returns Dr. Mahalle as first result
- Search "VIT Pune" returns all VIT researchers

---

## Phase 10: Final Validation
**Goal:** Everything works end-to-end.

### Verify all of these:
- [ ] `docker compose up -d` starts all services (PostgreSQL, Redis, Meilisearch)
- [ ] `alembic upgrade head` creates all tables
- [ ] `python scripts/seed_researchers.py` loads 10 researchers with correct scores
- [ ] Dr. Mahalle scores 84.4 ± 0.5 (GR-B, Rank #7)
- [ ] Dr. Guo scores 87+ (GR-A)
- [ ] Dr. Salve scores 40-45 (GR-D)
- [ ] GET /api/v1/researchers/{mahalle_id}/rating returns 200 with full breakdown
- [ ] GET /api/v1/researchers/top returns 10 researchers sorted by score
- [ ] GET /api/v1/researchers/search?q=Mahalle returns correct result
- [ ] POST /api/v1/researchers/{id}/refresh returns 202 and queues Celery task
- [ ] GET /api/v1/health returns all services healthy
- [ ] Redis caching works — second request is faster than first
- [ ] All pytest tests pass: `pytest -v`

---

## Post-MVP (do NOT build yet)
- The Lens API integration for real patent data
- Crossref Events for real societal reach data
- Pillar 5 formulas (when GR Connect has platform data)
- Field normalization for cross-discipline fairness
- Fraud detection layer for self-reported data
- Percentile-based tier thresholds (instead of fixed 85/70/50/30)
