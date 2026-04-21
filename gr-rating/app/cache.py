import json
import uuid
from redis.asyncio import Redis
from app.config import settings

redis_client = Redis.from_url(settings.redis_url, decode_responses=True)

RATING_KEY_PREFIX = "gr:rating:"
DEFAULT_TTL = 86400  # 24 hours


async def cache_gr_rating(
    researcher_id: uuid.UUID, rating_dict: dict, ttl: int = DEFAULT_TTL
) -> None:
    key = f"{RATING_KEY_PREFIX}{researcher_id}"
    await redis_client.set(key, json.dumps(rating_dict, default=str), ex=ttl)


async def get_cached_rating(researcher_id: uuid.UUID) -> dict | None:
    key = f"{RATING_KEY_PREFIX}{researcher_id}"
    data = await redis_client.get(key)
    if data:
        return json.loads(data)
    return None


async def invalidate_rating(researcher_id: uuid.UUID) -> None:
    key = f"{RATING_KEY_PREFIX}{researcher_id}"
    await redis_client.delete(key)
