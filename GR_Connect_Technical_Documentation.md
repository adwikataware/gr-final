# GR Connect — Technical Documentation
### GR Scholastic LLP · April 2026 · v1.0

---

## 1. System Overview

GR Connect is a research expert discovery and consultation platform that connects knowledge seekers with verified researchers. The platform features a proprietary **GR Rating** — a transparent, data-driven scoring system that evaluates researchers across 5 pillars using a saturation-based mathematical model.

**Current State**: Development (localhost)
**Researchers in DB**: 11
**Frontend Pages**: 8
**API Endpoints**: 6

---

## 2. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend Framework | Next.js (App Router) | 16.1.6 |
| UI Library | React | 19 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | v4 (@theme config) |
| Animations | Framer Motion | Latest |
| Backend Framework | FastAPI (async) | Latest |
| Backend Language | Python | 3.12 |
| Database | PostgreSQL | 15 |
| Cache | Redis | 7 |
| Search Engine | Meilisearch | 1.6 |
| ORM | SQLAlchemy (async) | 2.x |
| Task Queue | Celery (Redis broker) | Latest |
| Containerization | Docker Compose | Latest |
| Data Source | OpenAlex API | Free tier |
| Fonts | Playfair Display, Inter, Newsreader | Google Fonts |

---

## 3. Architecture

```
┌──────────────────────────────────────────────────────┐
│                   USER BROWSER                        │
│                  localhost:3000                        │
│                                                       │
│   Homepage ─────── mockData.ts                        │
│   Discover ─────── mockData.ts                        │
│   Expert Profile ── mockData.ts                       │
│   GR Rating ────── LIVE API ──────┐                   │
│   Dashboard ────── mockData.ts    │                   │
│   Hub ──────────── mockData.ts    │                   │
│   Booking ──────── mockData.ts    │                   │
└───────────────────────────────────┼───────────────────┘
                                    │
                   Next.js rewrite (next.config.ts)
                   /api/v1/* → localhost:8000/api/v1/*
                                    │
                                    ▼
┌──────────────────────────────────────────────────────┐
│                FastAPI BACKEND                        │
│               localhost:8000                          │
│                                                       │
│   /api/v1/researchers/top                             │
│   /api/v1/researchers/search                          │
│   /api/v1/researchers/{id}/rating                     │
│   /api/v1/researchers/{id}/rating/detailed            │
│   /api/v1/researchers/ingest                          │
│   /api/v1/researchers/{id}/refresh                    │
│   /api/v1/health                                      │
│                                                       │
│   Scoring Engine:                                     │
│   S(x) = 100 × max(x,0) / (max(x,0) + c)           │
│   GR = 0.25×P1 + 0.30×P2 + 0.15×P3 + 0.20×P4       │
│        + 0.10×P5                                      │
└──────┬──────────────┬──────────────┬─────────────────┘
       │              │              │
       ▼              ▼              ▼
  PostgreSQL       Redis        Meilisearch
  (port 5433)    (port 6379)    (port 7700)
  ┌──────────┐   ┌──────────┐   ┌───────────┐
  │researchers│   │API cache │   │Full-text   │
  │gr_ratings │   │rating    │   │researcher  │
  │raw_metrics│   │responses │   │name search │
  └──────────┘   └──────────┘   └───────────┘
```

---

## 4. Frontend — Pages & Features

### 4.1 Homepage (`/`)
- **File**: `src/app/page.tsx` (1,023 lines)
- **Data**: mockData.ts
- **Sections**:
  - Hero with animated search bar + rotating tagline
  - Marquee strip of 12 institutions (MIT, Stanford, Oxford, IITs, etc.)
  - **How It Works** — 3 cards with scroll-driven stacking animation:
    - AI Chat (free) → Premium Message ($50) → Video Consultation ($120)
    - Cards start stacked, split apart on scroll, one-way animation
  - **Featured Experts** — 3D perspective layer scroller with 5 mock experts
  - **GR Rating Spotlight** — Animated circular progress (score display)
  - "See how it's calculated" → links to `/gr-rating`
  - **UN SDGs** — 17 goal cards with color coding
  - **FAQ** — 5 collapsible accordion items
  - **CTA** — Join platform call-to-action

### 4.2 Find Experts (`/discover`)
- **File**: `src/app/discover/page.tsx` (576 lines)
- **Data**: mockData.ts (5 experts, 17 SDGs)
- **Left Sidebar Filters**:
  - Search by name / topic / institution
  - Hourly rate range slider ($50–$500+)
  - GR Rating tier filter (Elite / Premier / Verified)
  - Availability filter (Any / This Week / Today)
  - SDG alignment grid (17 clickable squares)
- **Quick Filter Tags**: All, IoT, AI/ML, Biology, Climate, Security
- **Expert Cards**: Avatar, name, title, institution, GR tier badge, expertise tags, SDG dots, rate, availability, "View Profile" CTA
- **Pagination**: Load More (6 per page)

### 4.3 Expert Profile (`/expert/[id]`)
- **File**: `src/app/expert/[id]/page.tsx` (873 lines)
- **Data**: mockData.ts
- **Left Column (8/12)**:
  - Profile header: avatar, name, expertise, verified badge, institution, bio
  - GR Rating circular progress + tier badge
  - Research Impact: total citations, h-index, i10-index, impact percentile bar
  - GR SDG Index: grid of 17 SDGs (active/inactive)
  - Selected Publications: title, journal, year, citation count
  - Awards & Recognition
- **Right Sidebar (4/12, sticky)**:
  - AI Assistant: free chat trained on researcher's papers
  - Premium Message: $50+ direct consultation
  - Schedule Consultation: calendar widget with date/time picker
  - Similar Experts: related researcher cards

### 4.4 GR Rating Methodology (`/gr-rating`)
- **File**: `src/app/gr-rating/page.tsx` (846 lines)
- **Data**: LIVE BACKEND API
- **Sections**:
  - Hero: "The GR Rating" title
  - **Saturation Function**: Formula S(x) = 100x/(x+c) with SVG curve visualization
  - **Composite Formula**: Animated weight bars showing pillar proportions
  - **5 Pillars**: Each with sub-metrics, c-values, weights, curve examples
  - **Tier Classification**: Table (GR-S through GR-D)
  - **Live Calculator**: Dropdown of all 11 researchers → click to fetch real pillar breakdown from backend API
  - **Why This Approach**: Anti-gaming, transparency, nightly updates

### 4.5 Research Hub (`/hub`)
- **File**: `src/app/hub/page.tsx` (409 lines)
- **Data**: mockData.ts
- **Layout**: 3-column (sidebar, feed, trending)
- **Features**:
  - Post composer (text + attachments)
  - Collaboration posts with type badges (Collab Call / Snippet / Review Request)
  - Engagement: likes, comments, share, bookmark
  - Trending topics (#FederatedLearning, #CRISPRTherapeutics, etc.)
  - Suggested scholars + upcoming conference card

### 4.6 Dashboard (`/dashboard`)
- **File**: `src/app/dashboard/page.tsx` (478 lines)
- **Data**: mockData.ts + AuthContext
- **Features**:
  - Profile header with banner, avatar, role badge
  - 4 stat cards: Sessions (12), Experts Connected (5), Messages (34), Hours (8)
  - Upcoming sessions list
  - Recent activity timeline
  - Recommended experts carousel
- **Auth Gate**: Redirects to `/login` if not authenticated

### 4.7 Booking Confirmation (`/booking`)
- **File**: `src/app/booking/page.tsx` (210 lines)
- **Data**: mockData.ts
- Success confirmation with booking details grid
- Actions: Add to Calendar, View Dashboard, Message Expert

### 4.8 Login & Signup (`/login`, `/signup`)
- Placeholder UI — no authentication wired yet

---

## 5. Frontend — Components

| Component | File | Purpose |
|-----------|------|---------|
| Avatar | `src/components/Avatar.tsx` | Initials-based avatar with deterministic warm-toned background colors. Strips "Dr." prefix. |
| CountUp | `src/components/CountUp.tsx` | Animated number counter (used in stats) |
| MagneticButton | `src/components/MagneticButton.tsx` | Interactive button with magnetic hover effect |
| MobileTabBar | `src/components/MobileTabBar.tsx` | Bottom navigation bar for mobile |
| Navbar | `src/components/Navbar.tsx` | Top navigation with logo, links, auth |
| ParticleWeb | `src/components/ParticleWeb.tsx` | Interactive particle background animation |
| ScrollRevealText | `src/components/ScrollRevealText.tsx` | Text that reveals word-by-word on scroll |
| ThreadsBackground | `src/components/ThreadsBackground.tsx` | Animated threads background effect |

---

## 6. Frontend — Data Layer

### Mock Data (`src/data/mockData.ts` — 265 lines)

**5 Expert Profiles**:
| # | Name | Institution | GR Rating | Publications | Citations | h-index | SDGs |
|---|------|-------------|-----------|-------------|-----------|---------|------|
| 1 | Dr. Parikshit N. Mahalle | VIT, Pune | 84.4 | 156 | 4,250 | 38 | 4, 9, 11, 16 |
| 2 | Dr. Elena Vasquez | MIT | 98 | 189 | 5,820 | 52 | 3, 9, 15 |
| 3 | Dr. Rajesh Kumar | IIT Delhi | 94 | 112 | 3,100 | 34 | 4, 8, 9 |
| 4 | Dr. Sarah Chen | Stanford | 91 | 87 | 2,450 | 29 | 3, 4, 10, 16 |
| 5 | Dr. James Okonkwo | Oxford | 89 | 73 | 1,980 | 26 | 7, 13, 14, 15 |

**17 UN SDGs**: Each with id, name, color
**Mock Messages**: Conversation between seeker and Dr. Parikshit (IoT security)
**Collaboration Posts**: 3 posts (Collab Call, Snippet, Review Request)
**Current User**: Alex Thompson, Masters student, University of Pune

### API Client (`src/lib/api.ts` — 101 lines)

```typescript
Base: "/api/v1/researchers" (proxied to backend)

Functions:
  searchResearchers(query, limit) → ResearcherSummary[]
  getTopResearchers(limit, offset, tier?) → ResearcherListResponse
  getResearcherRating(id) → ResearcherRating
  getResearcherDetailed(id) → DetailedRating

Types:
  ResearcherSummary { researcher_id, name, affiliation, gr_rating, tier }
  ResearcherRating  { ...Summary, tier_label, rank, total_researchers, pillars, computed_at }
  PillarDetail      { score, label, weight }
  DetailedRating    { ...Rating, raw_metrics }
  RawMetrics        { h_index, total_citations, publications, i10_index, fwci,
                      citation_velocity, recency_index, sdg_count, oa_percentage,
                      total_patents, books_authored, unique_funders }
```

### Auth Context (`src/lib/AuthContext.tsx`)
- React Context with `useAuth()` hook
- Provides: `user`, `isLoggedIn`, `login()`, `logout()`
- Currently mock — no Firebase integration yet

---

## 7. Backend — API Endpoints

### GET `/api/v1/researchers/top`
**Purpose**: Leaderboard / ranked list
**Params**: `limit` (default 10), `offset` (default 0), `tier` (optional), `sort` (default "gr_rating")
**Response**:
```json
{
  "researchers": [
    { "researcher_id": "uuid", "name": "Dr. X", "affiliation": "MIT", "gr_rating": 87.7, "tier": "GR-A" }
  ],
  "total": 10,
  "limit": 10,
  "offset": 0
}
```

### GET `/api/v1/researchers/search`
**Purpose**: Full-text researcher search
**Params**: `q` (query string), `limit` (default 10)
**Flow**: Meilisearch (fuzzy) → fallback to PostgreSQL ILIKE
**Response**: `[{ researcher_id, name, affiliation, gr_rating, tier }]`

### GET `/api/v1/researchers/{id}/rating`
**Purpose**: Get computed GR Rating with pillar breakdown
**Flow**: Redis cache → PostgreSQL → return
**Response**:
```json
{
  "researcher_id": "uuid",
  "name": "Dr. Parikshit Mahalle",
  "affiliation": "VIT, Pune",
  "gr_rating": 84.4,
  "tier": "GR-B",
  "tier_label": "Distinguished",
  "rank": 5,
  "total_researchers": 11,
  "pillars": {
    "p1": { "score": 95.05, "label": "Core Research", "weight": 0.25 },
    "p2": { "score": 87.08, "label": "Real-Time Performance", "weight": 0.30 },
    "p3": { "score": 76.26, "label": "Societal Impact", "weight": 0.15 },
    "p4": { "score": 90.14, "label": "Innovation", "weight": 0.20 },
    "p5": { "score": 50.00, "label": "Community", "weight": 0.10 }
  },
  "computed_at": "2026-03-25T..."
}
```

### GET `/api/v1/researchers/{id}/rating/detailed`
**Purpose**: Full breakdown including raw metrics
**Response**: Same as above + `raw_metrics` object with all input values

### POST `/api/v1/researchers/ingest`
**Purpose**: Queue new researcher for ingestion
**Params**: `openalex_id` (query)
**Flow**: Creates researcher → queues Celery task → fetches OpenAlex data → computes scores
**Response**: `{ status: "accepted", researcher_id: "uuid", task_id: "celery-id" }`

### POST `/api/v1/researchers/{id}/refresh`
**Purpose**: Recompute scores from fresh data
**Response**: `{ status: "accepted", task_id: "celery-id" }`

### GET `/api/v1/health`
**Purpose**: Service health check (API + Redis + Meilisearch)

---

## 8. Backend — Database Models

### `researchers` Table
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| name | VARCHAR(255) | |
| affiliation | VARCHAR(500) | |
| openalex_id | VARCHAR(50) | Unique, indexed |
| semantic_scholar_id | VARCHAR(50) | Optional |
| orcid | VARCHAR(50) | Optional |
| google_scholar_id | VARCHAR(50) | Optional |
| created_at | TIMESTAMP | Auto |
| updated_at | TIMESTAMP | Auto |

### `gr_ratings` Table
| Column | Type | Notes |
|--------|------|-------|
| researcher_id | UUID | PK, FK → researchers |
| p1_score | FLOAT | Core Research (0–100) |
| p2_score | FLOAT | Performance (0–100) |
| p3_score | FLOAT | Societal Impact (0–100) |
| p4_score | FLOAT | Innovation (0–100) |
| p5_score | FLOAT | Community (0–100) |
| gr_rating | FLOAT | Composite (0–100), indexed |
| tier | VARCHAR(10) | GR-S/A/B/C/D, indexed |
| rank_overall | INT | Rank among all researchers |
| computed_at | TIMESTAMP | |

### `raw_metrics` Table
| Column | Type | Source |
|--------|------|--------|
| researcher_id | UUID | FK → researchers |
| h_index | INT | OpenAlex |
| total_citations | INT | OpenAlex |
| publications | INT | OpenAlex |
| i10_index | INT | OpenAlex |
| fwci | FLOAT | Computed |
| citation_velocity | FLOAT | Computed |
| recency_index | FLOAT | Computed |
| topic_prominence_cagr | FLOAT | Computed |
| active_years | INT | Computed |
| sdg_count | INT | OpenAlex |
| sdg_mean_confidence | FLOAT | OpenAlex |
| oa_percentage | FLOAT | OpenAlex |
| societal_mentions | INT | OpenAlex |
| total_patents | INT | OpenAlex |
| books_authored | INT | OpenAlex |
| books_edited | INT | OpenAlex |
| unique_funders | INT | OpenAlex |
| patent_links | INT | OpenAlex |
| fetched_at | TIMESTAMP | |
| source | VARCHAR | "openalex" |

---

## 9. GR Rating — Scoring Engine

### 9.1 Saturation Function

```
S(x) = 100 × max(x, 0) / (max(x, 0) + c)
```

- **x** = raw metric value
- **c** = half-score constant (value where S = 50)
- Produces scores from 0 to 100 with diminishing returns
- Prevents gaming: doubling a high metric yields minimal gain

### 9.2 Five Pillars

#### Pillar 1: Core Research (Weight: 25%)
| Metric | c-value | Weight | What It Measures |
|--------|---------|--------|-----------------|
| h-index | 3 | 30% | Balanced impact & productivity |
| Total Citations | 180 | 25% | Cumulative research impact |
| Publications | 8 | 25% | Total research output |
| i10-index | 3 | 20% | High-impact paper count |

#### Pillar 2: Real-Time Performance (Weight: 30%)
| Metric | c-value | Weight | What It Measures |
|--------|---------|--------|-----------------|
| FWCI | 0.3 | 35% | Field-weighted citation impact |
| Citation Velocity | 12 | 25% | Recent citations per year |
| Recency Index | 0.3 | 20% | Proportion of work in last 5 years |
| Topic Prominence CAGR | 3 | 20% | Growth rate of research topics |

*Career Guard*: If active_years < 5, recency_index is forced to 1.0

#### Pillar 3: Societal Impact (Weight: 15%)
| Metric | c-value | Weight | What It Measures |
|--------|---------|--------|-----------------|
| SDG Coverage | 1.5 | — | Number of UN SDGs addressed |
| SDG Confidence | 0.18 | — | Average alignment confidence |
| Open Access % | 10 | — | OA publication rate |
| Societal Mentions | 4 | — | Policy/news/Wikipedia references |

#### Pillar 4: Innovation & Economic Assets (Weight: 20%)
| Metric | c-value | Weight | What It Measures |
|--------|---------|--------|-----------------|
| Patents | 2.5 | 30% | Total patent filings |
| Books | 2 | 25% | Authored + 0.5 × edited |
| Unique Funders | 1.2 | 25% | Funding diversity |
| Patent-Paper Links | 2 | 20% | Cross-citations |

#### Pillar 5: Community & Peer Recognition (Weight: 10%)
- Currently returns **neutral 50.0** for all researchers
- Will incorporate: peer reviews, editorial board roles, conference committee memberships

### 9.3 Composite Formula

```
GR Rating = (0.25 × P1) + (0.30 × P2) + (0.15 × P3) + (0.20 × P4) + (0.10 × P5)
```

### 9.4 Tier Classification

| Tier | Score Range | Label |
|------|------------|-------|
| GR-S | 95–100 | Exceptional |
| GR-A | 85–94 | Outstanding |
| GR-B | 70–84 | Distinguished |
| GR-C | 50–69 | Emerging |
| GR-D | 0–49 | Developing |

---

## 10. Current Researcher Data (11 in Database)

| Rank | Name | Affiliation | GR Rating | Tier | h-index | Citations |
|------|------|-------------|-----------|------|---------|-----------|
| 1 | Dr. Zhanhu Guo | Univ. of Tennessee | 87.7 | GR-A | 130 | 115,000 |
| 2 | Dr. Ganapati Yadav | ICT Mumbai | 86.0 | GR-A | 70 | 20,500 |
| 3 | Dr. Ketan Kotecha | Symbiosis, Pune | 86.0 | GR-A | 55 | 16,000 |
| 4 | Dr. Nilanjan Dey | Techno India, Kolkata | 85.1 | GR-A | 72 | 27,500 |
| 5 | Dr. Parikshit Mahalle | VIT, Pune | 84.4 | GR-B | 29 | 4,700 |
| 6 | Dr. Jagdish C. Bansal | South Asian Univ., Delhi | 75.9 | GR-B | 34 | 5,800 |
| 7 | Dr. Dattatray Takale | VIT, Pune | 74.6 | GR-B | 13 | 688 |
| 8 | Dr. Gitanjali Shinde | VIT, Pune | 74.2 | GR-B | 17 | 1,200 |
| 9 | Feng-Che Kuan | Chang Gung University | 71.8 | GR-B | — | — |
| 10 | Dr. Vijay S. Rathore | GEC, Rajasthan | 63.8 | GR-C | 13 | 616 |
| 11 | Dr. Sushilkumar Salve | VIT, Pune | 42.5 | GR-D | 4 | 49 |

---

## 11. Data Flow — End to End

### Flow 1: Researcher Ingestion
```
OpenAlex API
  → POST /api/v1/researchers/ingest?openalex_id=W12345
    → Creates Researcher record in PostgreSQL
    → Queues Celery task
      → Fetches raw metrics from OpenAlex (h-index, citations, SDGs, patents, etc.)
      → Stores in raw_metrics table
      → Applies saturation function to each metric
      → Computes P1–P5 pillar scores
      → Computes composite GR Rating
      → Assigns tier (GR-S through GR-D)
      → Calculates rank
      → Stores in gr_ratings table
      → Caches in Redis
      → Indexes in Meilisearch
```

### Flow 2: Live Calculator (GR Rating Page)
```
User opens /gr-rating
  → Frontend fetches GET /api/v1/researchers/top?limit=50
  → Dropdown populated with 11 researchers
  → User selects "Dr. Parikshit Mahalle"
  → Frontend fetches GET /api/v1/researchers/{id}/rating
    → Backend checks Redis cache
    → Cache miss → queries PostgreSQL
    → Returns pillar scores + composite + tier
  → Frontend renders animated bar chart breakdown
```

### Flow 3: Expert Discovery (Mock)
```
User opens /discover
  → Frontend loads experts[] from mockData.ts
  → User applies filters (rate, tier, SDG, search)
  → Frontend filters array client-side
  → Renders expert cards
  → User clicks "View Profile"
  → Navigates to /expert/{id}
  → Loads expert from mockData by ID
  → Renders full profile with all sections
```

### Flow 4: Consultation Booking (Mock)
```
User on /expert/{id}
  → Clicks "Schedule Consultation"
  → Selects date + time from calendar
  → Clicks "Confirm Booking"
  → Redirects to /booking
  → Shows confirmation with booking details
```

---

## 12. Design System

### Color Palette
| Token | Hex | Usage |
|-------|-----|-------|
| charcoal | #191919 | Dark text, backgrounds |
| warm-brown | #9D8461 | Primary accent, CTAs, highlights |
| warm-brown-dark | #7A6545 | Hover states |
| cream-bg | #F5F3F0 | Page backgrounds |
| text-muted | #5E5D59 | Secondary text |
| clay-muted | #C4B5A0 | Borders, subtle elements |

### Typography
| Font | Usage |
|------|-------|
| Playfair Display | Headings, hero text |
| Inter | Body text, UI elements |
| Newsreader | Serif accents, quotes |

---

## 13. Configuration & Ports

| Service | Port | Container Name | Config |
|---------|------|---------------|--------|
| Next.js Frontend | 3000 | — (local) | `next.config.ts` |
| FastAPI Backend | 8000 | — (local) | `app/config.py` |
| PostgreSQL 15 | 5433 | gr-rating-postgres | docker-compose.yml |
| Redis 7 | 6379 | gr-rating-redis | docker-compose.yml |
| Meilisearch 1.6 | 7700 | gr-rating-meilisearch | docker-compose.yml |

### API Proxy
```typescript
// next.config.ts
rewrites: [{ source: "/api/v1/:path*", destination: "http://localhost:8000/api/v1/:path*" }]
```

### Database Credentials
```
DB: gr_rating | User: gruser | Password: grpass | Host: localhost:5433
```

---

## 14. File Structure

```
D:\GR\
├── gr-connect\                          # Next.js Frontend
│   ├── src\
│   │   ├── app\
│   │   │   ├── page.tsx                 # Homepage (1,023 lines)
│   │   │   ├── layout.tsx               # Root layout + metadata
│   │   │   ├── globals.css              # Tailwind + custom styles
│   │   │   ├── discover\page.tsx        # Find Experts (576 lines)
│   │   │   ├── expert\[id]\page.tsx     # Expert Profile (873 lines)
│   │   │   ├── gr-rating\page.tsx       # GR Rating + Live Calculator (846 lines)
│   │   │   ├── hub\page.tsx             # Research Hub (409 lines)
│   │   │   ├── dashboard\page.tsx       # User Dashboard (478 lines)
│   │   │   ├── booking\page.tsx         # Booking Confirmation (210 lines)
│   │   │   ├── login\page.tsx           # Login (placeholder)
│   │   │   ├── signup\page.tsx          # Signup (placeholder)
│   │   │   └── messages\page.tsx        # Messages (placeholder)
│   │   ├── components\
│   │   │   ├── Avatar.tsx               # Initials avatar
│   │   │   ├── CountUp.tsx              # Animated counter
│   │   │   ├── MagneticButton.tsx       # Magnetic hover button
│   │   │   ├── MobileTabBar.tsx         # Mobile bottom nav
│   │   │   ├── Navbar.tsx               # Top navigation
│   │   │   ├── ParticleWeb.tsx          # Particle background
│   │   │   ├── ScrollRevealText.tsx     # Scroll reveal text
│   │   │   └── ThreadsBackground.tsx    # Threads effect
│   │   ├── data\
│   │   │   └── mockData.ts             # Mock experts, SDGs, messages (265 lines)
│   │   └── lib\
│   │       ├── api.ts                   # Typed API client (101 lines)
│   │       └── AuthContext.tsx           # Auth context (mock)
│   ├── next.config.ts                   # API proxy + image config
│   ├── tailwind.config.ts               # Tailwind theme
│   └── package.json
│
└── gr-rating\                           # FastAPI Backend
    ├── app\
    │   ├── main.py                      # FastAPI app + lifespan
    │   ├── config.py                    # Settings (DB, Redis, Meili URLs)
    │   ├── database.py                  # Async SQLAlchemy engine
    │   ├── api\
    │   │   └── v1\
    │   │       └── researchers.py       # All API endpoints
    │   ├── models\
    │   │   ├── researcher.py            # Researcher model
    │   │   ├── gr_rating.py             # GR Rating model
    │   │   └── raw_metrics.py           # Raw metrics model
    │   ├── core\                        # Rating computation
    │   └── scoring\
    │       ├── pillar1.py               # Core Research scoring
    │       ├── pillar2.py               # Performance scoring
    │       ├── pillar3.py               # Societal Impact scoring
    │       ├── pillar4.py               # Innovation scoring
    │       ├── pillar5.py               # Community scoring (neutral 50)
    │       └── composite.py             # Composite + tier assignment
    ├── scripts\
    │   └── seed_researchers.py          # Seeds 10 calibration researchers
    ├── alembic\                         # DB migrations
    ├── tests\                           # Test suite
    ├── docker-compose.yml               # PostgreSQL + Redis + Meilisearch
    └── pyproject.toml                   # Python dependencies
```

---

## 15. What Uses Live Backend vs Mock Data

| Feature | Data Source | Status |
|---------|-----------|--------|
| Homepage experts carousel | mockData.ts | Mock |
| Homepage GR Rating spotlight | mockData.ts | Mock |
| "See how it's calculated" link | Static | Live (links to /gr-rating) |
| Discover page experts | mockData.ts | Mock |
| Discover page filters | mockData.ts | Mock |
| Expert profile | mockData.ts | Mock |
| Research Hub posts | mockData.ts | Mock |
| Dashboard stats | mockData.ts | Mock |
| Booking confirmation | mockData.ts | Mock |
| **GR Rating methodology** | **Live backend API** | **Live** |
| **Live Calculator dropdown** | **GET /researchers/top** | **Live** |
| **Live Calculator breakdown** | **GET /researchers/{id}/rating** | **Live** |
| **Researcher search** | **GET /researchers/search** | **Live** |

---

*Document generated: April 2026*
*GR Connect v1.0 — Development Build*
