# GR Rating — Project Intelligence

## Project Overview
GR Rating is the flagship scoring engine for GR Connect (GR Scholastic LLP) — a consultation marketplace connecting researchers with seekers globally. The rating evaluates researchers on a 0–100 scale across 5 pillars using free, open data sources. This project has two parts: the scoring backend (FastAPI) and the frontend (Next.js).

---

## BACKEND — Scoring Engine

### Tech Stack
- **API**: FastAPI (Python 3.11+, async)
- **Database**: PostgreSQL 15+ (SQLAlchemy 2.0 async, Alembic migrations, UUID PKs)
- **Cache**: Redis 7+ (score cache + FWCI field average cache, TTL 24h)
- **Task Queue**: Celery with Redis broker
- **Scheduler**: Celery Beat
- **Search**: Meilisearch (researcher discovery)
- **HTTP Client**: httpx (async, for external API calls)
- **External APIs**: OpenAlex (primary), Semantic Scholar, The Lens, Crossref Events, ORCID

### Architecture Principles
1. **Pre-compute everything**: User-facing endpoints NEVER call external APIs
2. **Sub-100ms responses**: All score lookups serve from Redis cache
3. **One universal function**: `S(x) = 100 * max(x, 0) / (max(x, 0) + c)` for every sub-metric
4. **Asymptotic saturation**: No score reaches 100. No use of `min()`

### The Universal Scoring Function
```python
def saturation_score(x: float, c: float) -> float:
    v = max(x, 0.0)
    return 100.0 * v / (v + c) if (v + c) > 0 else 0.0
```

### c-Value Constants (FINAL v4 — calibrated against 101 researchers)
**DO NOT CHANGE without re-running full calibration.**

| Pillar | Sub-metric | c | Weight |
|--------|-----------|---|--------|
| P1 (0.25) | h-index | 3 | 30% |
| P1 | Citations | 180 | 25% |
| P1 | Publications | 8 | 25% |
| P1 | i10-index | 3 | 20% |
| P2 (0.30) | FWCI | 0.3 | 35% |
| P2 | Citation velocity | 12 | 25% |
| P2 | Recency index | 0.3 | 20% |
| P2 | Topic prominence | 3 | 20% |
| P3 (0.15) | SDG coverage | 1.5 | 25% |
| P3 | SDG strength | 0.18 | 25% |
| P3 | Open access ratio | 10 | 25% |
| P3 | Societal reach | 4 | 25% |
| P4 (0.20) | Patents (total) | 2.5 | 30% |
| P4 | Books (auth+0.5*edit) | 2 | 25% |
| P4 | Grant diversity | 1.2 | 25% |
| P4 | Patent linkage | 2 | 20% |
| P5 (0.10) | Neutral default | N/A | 100% |

**Composite:** `GR = P1*0.25 + P2*0.30 + P3*0.15 + P4*0.20 + 50*0.10`

### Tier Classification
- GR-A (Exceptional): 85+
- GR-B (Distinguished): 70-84.9
- GR-C (Established): 50-69.9
- GR-D (Emerging): 30-49.9
- GR-E (Entry): 0-29.9

### Edge Cases
1. `active_years < 5` -> recency index defaults to 1.0
2. All P2 inputs floored at 0 via `max(x, 0)` — FWCI can be negative
3. P5 always returns 50 — no computation until platform has user data
4. Books: `b = books_authored + (0.5 * books_edited)`
5. Patents: single total count, no filed/granted split

### Testing Anchors
- Dr. Parikshit Mahalle: 84.4 +/- 0.5 (GR-B, Rank #7)
- Dr. Zhanhu Guo: 87+ (GR-A)
- Dr. Sushilkumar Salve: 40-45 (GR-D)
- No score should ever be exactly 100.0

### Backend Project Structure
```
gr-rating/
├── app/
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── models/                  # SQLAlchemy ORM
│   ├── schemas/                 # Pydantic v2
│   ├── scoring/                 # CORE — saturation.py, pillar1-5.py, composite.py
│   ├── ingestion/               # OpenAlex, S2, The Lens, Crossref Events
│   ├── workers/                 # Celery tasks
│   └── api/v1/                  # Route handlers
├── tests/test_scoring/          # HIGHEST PRIORITY tests
├── alembic/
└── docker-compose.yml
```

### API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/v1/researchers/{id}/rating | GET | Full GR Rating + pillar breakdown. Cache-first. 202 if computing. |
| /api/v1/researchers/{id}/rating/detailed | GET | Sub-metric level scores |
| /api/v1/researchers/search?q= | GET | Name/affiliation search via Meilisearch |
| /api/v1/researchers/top | GET | Top N by GR Rating. Params: tier, limit, offset, sort |
| /api/v1/researchers/{id}/refresh | POST | Trigger recompute. Rate limited 1/hr/researcher |
| /api/v1/health | GET | Health check |

---

## FRONTEND — Next.js Dashboard

### Tech Stack
- **Framework**: Next.js 14 (App Router, server components where possible)
- **Styling**: Tailwind CSS 3.4+ with custom GR design tokens
- **Animation**: Framer Motion 11+
- **Data Fetching**: TanStack Query v5
- **Icons**: Lucide React
- **Charts**: Custom SVG (no charting library)
- **Fonts**: DM Serif Display (display), DM Sans (body), JetBrains Mono (data)

### Design Direction
**Warm Brutalism meets Data Elegance** — think Bloomberg Terminal x Stripe x Moody's credit ratings. Warm earth tones (sand, clay, deep navy). Large confident typography. Paper-like textures. The rating number is the visual hero.

**NEVER:** purple gradients, Inter/Roboto/system fonts, generic dashboard templates, excessive rounded corners, neon glassmorphism, #F5F5F5 background with white cards.

### Color Tokens
- `--gr-bg-primary`: #FAF8F5 (warm off-white, NOT pure white)
- `--gr-bg-secondary`: #F0EDE8
- `--gr-navy`: #1B3A4B (primary brand)
- `--gr-clay`: #C4956A (warm accent)
- `--gr-sand`: #D4C5A9 (subtle accent)
- `--gr-ink`: #2C2825 (deep text)

### Tier Colors
- GR-A: bg #F0F7F0, text #1B5E20
- GR-B: bg #EBF4FA, text #0D47A1
- GR-C: bg #FFF8E1, text #E65100
- GR-D: bg #FFF3E0, text #BF360C
- GR-E: bg #F5F5F5, text #616161

### Key Components
1. **ScoreRing** — SVG circle with animated fill. DM Serif Display score. Tier badge below.
2. **PillarBreakdown** — 5 horizontal bars with staggered animation.
3. **PillarRadar** — SVG pentagon spider chart. Research profile fingerprint.
4. **TierBadge** — Pill/card variants with tier color coding.
5. **ResearcherCard** — Horizontal card for listings. Rank + name + metrics + ScoreRing.
6. **SearchBar** — Full-width with instant dropdown results. Debounce 300ms.
7. **TierFilter** — Horizontal tier pills with counts. Multi-select.
8. **StatCard** — Small stat display with label + large number.
9. **MetricChip** — Inline label+value chip for h-index, citations, etc.

### Pages
1. **Dashboard (/)** — SearchBar -> Stats row -> TierFilter -> ResearcherCard list (sorted, paginated)
2. **Profile (/researchers/[id])** — Hero (name + ScoreRing) -> PillarBreakdown + Radar -> Pillar detail cards -> Similar researchers
3. **Compare (/compare)** — Stretch goal. Side-by-side radar overlay.

### Frontend Project Structure
```
gr-rating-frontend/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                # Dashboard
│   ├── researchers/[id]/page.tsx  # Profile
│   └── globals.css
├── components/                 # All components listed above
├── lib/
│   ├── api.ts                  # API client (fetch + TanStack Query hooks)
│   ├── tier-config.ts          # Tier -> { bg, text, border, label }
│   ├── format.ts               # 4715 -> '4.7K'
│   └── types.ts
├── tailwind.config.ts          # GR design tokens
└── package.json
```

### 202 Handling (Loading State)
When API returns 202 (score computing), show ScoreRing as animated spinner, display "Computing GR Rating..." message, and poll every 5 seconds via TanStack Query's refetchInterval until 200.

---

## Code Style (Both Projects)
- TypeScript strict mode (frontend)
- Python type hints everywhere (backend)
- Async/await for all I/O
- No `any` types in TypeScript
- Format with Prettier (frontend) / ruff (backend)
- Meaningful variable names — `gr_rating` not `score`, `tier` not `level`

## What NOT to Build
- No authentication (handled by GR Connect gateway)
- No payment processing
- No researcher profile CRUD (separate service)
- Do NOT modify scoring formula or c-values without explicit instruction
