"""
Bulk enrich all researchers in DB that are missing bio/topics/photo_url.
Fetches from OpenAlex using openalex_id.
Run: python enrich_researchers.py
"""
import asyncio, json, os
from dotenv import load_dotenv
load_dotenv()

import httpx
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, text

DATABASE_URL = os.environ["DATABASE_URL"]
OPENALEX_EMAIL = os.environ.get("OPENALEX_EMAIL", "")
BASE_URL = "https://api.openalex.org"
HEADERS = {"User-Agent": f"GRConnect/1.0 (mailto:{OPENALEX_EMAIL})"}

engine = create_async_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def fetch_openalex(client: httpx.AsyncClient, openalex_id: str) -> dict | None:
    try:
        resp = await client.get(f"{BASE_URL}/authors/{openalex_id}", headers=HEADERS, timeout=15)
        if resp.status_code != 200:
            return None
        author = resp.json()
        display_name = author.get("display_name", "")
        works_count = author.get("works_count", 0)
        cited_by_count = author.get("cited_by_count", 0)
        stats = author.get("summary_stats", {})
        h_index = stats.get("h_index", 0)
        i10_index = stats.get("i10_index", 0)
        affiliation = ""
        aff_list = author.get("affiliations", [])
        if aff_list:
            affiliation = aff_list[0].get("institution", {}).get("display_name", "")
        if not affiliation:
            last = author.get("last_known_institutions", [])
            if last:
                affiliation = last[0].get("display_name", "")
        topics = [t.get("display_name", "") for t in author.get("topics", [])[:6] if t.get("display_name")]
        bio = f"Researcher with {works_count} publications and {cited_by_count:,} citations."
        clean_name = display_name
        for prefix in ["Dr. ", "Prof. ", "Mr. ", "Mrs. ", "Ms. ", "Dr ", "Prof "]:
            clean_name = clean_name.replace(prefix, "")
        photo_url = f"https://ui-avatars.com/api/?name={clean_name.replace(' ', '+')}&background=8B5E3C&color=fff&size=200"
        return {
            "name": display_name,
            "affiliation": affiliation,
            "bio": bio,
            "photo_url": photo_url,
            "topics": json.dumps(topics),
            "metrics": {
                "h_index": h_index,
                "total_citations": cited_by_count,
                "publications": works_count,
                "i10_index": i10_index,
            },
        }
    except Exception as e:
        print(f"  Error fetching {openalex_id}: {e}")
        return None


async def main():
    async with SessionLocal() as session:
        # Get all researchers missing bio or topics
        result = await session.execute(
            text("SELECT id, name, openalex_id FROM researchers WHERE openalex_id IS NOT NULL AND openalex_id != '' LIMIT 200")
        )
        rows = result.fetchall()
        print(f"Found {len(rows)} researchers to enrich")

        async with httpx.AsyncClient(timeout=15) as client:
            for i, (rid, name, openalex_id) in enumerate(rows):
                print(f"[{i+1}/{len(rows)}] {name.encode('ascii','replace').decode()} ({openalex_id})")
                data = await fetch_openalex(client, openalex_id)
                if data:
                    metrics = data.pop("metrics")
                    await session.execute(
                        text("""
                            UPDATE researchers
                            SET bio = :bio,
                                photo_url = :photo_url,
                                topics = :topics,
                                affiliation = COALESCE(NULLIF(affiliation, ''), :affiliation),
                                name = COALESCE(NULLIF(name, ''), :name)
                            WHERE id = :id
                        """),
                        {**data, "id": str(rid)}
                    )
                    # Upsert raw_metrics
                    await session.execute(
                        text("""
                            INSERT INTO raw_metrics (researcher_id, h_index, total_citations, publications, i10_index, active_years, sdg_count, sdg_mean_confidence, oa_percentage, societal_mentions, total_patents, books_authored, books_edited, unique_funders, patent_links, source)
                            VALUES (:id, :h_index, :total_citations, :publications, :i10_index, 10, 0, 0.0, 0.0, 0, 0, 0, 0, 0, 0, 'openalex')
                            ON CONFLICT (researcher_id) DO UPDATE SET
                                h_index = EXCLUDED.h_index,
                                total_citations = EXCLUDED.total_citations,
                                publications = EXCLUDED.publications,
                                i10_index = EXCLUDED.i10_index
                        """),
                        {"id": str(rid), **metrics}
                    )
                    print(f"  -> h_index={metrics['h_index']} citations={metrics['total_citations']} pubs={metrics['publications']}")
                else:
                    print(f"  -> skipped (no data)")
                await asyncio.sleep(0.1)  # be nice to OpenAlex API

        await session.commit()
        print("\nDone!")


asyncio.run(main())
