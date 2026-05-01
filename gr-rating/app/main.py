import logging
import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.researchers import router as researchers_router
from app.api.v1.discover import router as discover_router
from app.api.v1.claim import router as claim_router
from app.api.v1.meetings import router as meetings_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure Meilisearch index exists
    try:
        from app.search import ensure_index, sync_all_researchers
        await ensure_index()
        count = await sync_all_researchers()
        logger.info(f"Meilisearch: synced {count} researchers")
    except Exception as e:
        logger.warning(f"Meilisearch init skipped: {e}")
    yield


app = FastAPI(title="GR Rating API", version="0.1.0", lifespan=lifespan)

_allowed_origins = [
    "https://gr-connect-frontend-479016713032.asia-south1.run.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
if os.environ.get("EXTRA_CORS_ORIGIN"):
    _allowed_origins.append(os.environ["EXTRA_CORS_ORIGIN"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(researchers_router)
app.include_router(discover_router)
app.include_router(claim_router)
app.include_router(meetings_router)


@app.get("/api/v1/health")
async def health_check():
    from app.cache import redis_client
    import httpx

    services = {"api": "ok"}

    # Check Redis
    try:
        await redis_client.ping()
        services["redis"] = "ok"
    except Exception:
        services["redis"] = "error"

    # Check Meilisearch
    try:
        from app.config import settings
        async with httpx.AsyncClient(timeout=3) as client:
            resp = await client.get(f"{settings.meilisearch_url}/health")
            services["meilisearch"] = "ok" if resp.status_code == 200 else "error"
    except Exception:
        services["meilisearch"] = "error"

    status = "ok" if all(v == "ok" for v in services.values()) else "degraded"
    return {"status": status, "services": services}
