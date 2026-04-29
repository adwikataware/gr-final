"""Fetch topics, SDGs, and photo URLs from OpenAlex and store in DB."""
import asyncio
import json
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import httpx
from sqlalchemy import select
from app.database import async_session
from app.models.researcher import Researcher

BASE_URL = "https://api.openalex.org"
EMAIL = "ayushwalunj1@gmail.com"


async def fetch_author(client: httpx.AsyncClient, openalex_id: str) -> dict:
    resp = await client.get(
        f"{BASE_URL}/authors/{openalex_id}",
        headers={"User-Agent": f"GRConnect/1.0 (mailto:{EMAIL})"},
    )
    if resp.status_code != 200:
        print(f"  Skipping {openalex_id}: HTTP {resp.status_code}")
        return {}
    return resp.json()


async def enrich():
    async with async_session() as session:
        researchers = (await session.execute(select(Researcher))).scalars().all()
        print(f"Enriching {len(researchers)} researchers from OpenAlex...\n")

        async with httpx.AsyncClient(timeout=30) as client:
            for r in researchers:
                if not r.openalex_id:
                    continue
                print(f"Fetching {r.name} ({r.openalex_id})...")
                data = await fetch_author(client, r.openalex_id)
                if not data:
                    continue

                # Topics — top 6 display names
                topics: list[str] = []
                for t in data.get("topics", [])[:6]:
                    name = t.get("display_name", "")
                    if name:
                        topics.append(name)

                # SDGs from x_concepts or topics
                sdg_ids: list[int] = []
                for sdg in data.get("sustainable_development_goals", []):
                    sdg_id = sdg.get("id", "")
                    # OpenAlex SDG ids look like "https://metadata.un.org/sdg/3"
                    try:
                        num = int(sdg_id.split("/")[-1])
                        if 1 <= num <= 17:
                            sdg_ids.append(num)
                    except (ValueError, AttributeError):
                        pass

                # Fallback: derive SDGs from topic names if none found
                if not sdg_ids:
                    topic_text = " ".join(topics).lower()
                    sdg_map = {
                        1: ["poverty"], 2: ["hunger", "food security"],
                        3: ["health", "medicine", "disease", "cancer", "covid"],
                        4: ["education", "learning"], 6: ["water"],
                        7: ["energy", "renewable", "solar", "wind"],
                        9: ["innovation", "industry", "infrastructure", "iot", "robotics"],
                        11: ["cities", "urban"], 13: ["climate", "carbon"],
                        14: ["ocean", "marine"], 15: ["biodiversity", "forest"],
                    }
                    for sdg_num, keywords in sdg_map.items():
                        if any(kw in topic_text for kw in keywords):
                            sdg_ids.append(sdg_num)
                    sdg_ids = sdg_ids[:5]

                # Photo — OpenAlex doesn't provide photos, use Wikipedia avatar if available
                photo_url = ""
                display_name_encoded = r.name.replace(" ", "_")
                # Use a reliable placeholder based on initials via UI Avatars
                initials = "".join(w[0] for w in r.name.split() if w)[:2].upper()
                photo_url = f"https://ui-avatars.com/api/?name={r.name.replace(' ', '+')}&background=8B5E3C&color=fff&size=200"

                r.topics = json.dumps(topics)
                r.sdg_ids = ",".join(str(x) for x in sdg_ids)
                r.photo_url = photo_url

                print(f"  Topics: {topics[:3]}")
                print(f"  SDGs: {sdg_ids}")
                print()

                await asyncio.sleep(0.3)  # be polite to OpenAlex

        await session.commit()
        print("Done. All researchers enriched.")


if __name__ == "__main__":
    asyncio.run(enrich())
