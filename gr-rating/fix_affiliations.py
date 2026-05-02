"""
Manual corrections for researchers where OpenAlex returned wrong affiliation.
Also re-fetches to get the best possible data per researcher.
Run: python fix_affiliations.py
"""
import asyncio, json, os, re
from dotenv import load_dotenv
load_dotenv()
import httpx
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

DATABASE_URL = os.environ["DATABASE_URL"]
BASE_URL = "https://api.openalex.org"
HEADERS = {"User-Agent": "GRConnect/1.0 (mailto:adwikataware@gmail.com)"}

engine = create_async_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# Manual overrides: openalex_id -> correct affiliation (when OpenAlex is wrong)
AFFILIATION_OVERRIDES = {
    "A5080409343": "VIT, Pune",                          # Gitanjali Shinde — OpenAlex shows Cairo Univ (wrong)
    "A5093554874": "VIT, Pune",                          # Dattatray Takale — IIIT is plausible but seed said VIT
    "A5017173320": "VIT, Pune",                          # Sushilkumar Salve — seed said VIT Pune
    "A5000975435": "Techno India University, Kolkata",        # Nilanjan Dey — OpenAlex shows Chandigarh Univ (wrong)
    "A5063648631": "Institute of Chemical Technology, Mumbai", # Ganapati Yadav — OpenAlex shows CSWRI (wrong)
}

# Manual ORCID overrides where we want a specific OpenAlex ID
OPENALEX_OVERRIDES = {
    # name -> correct openalex_id (only add if we know for sure)
}


async def fetch_author(client: httpx.AsyncClient, openalex_id: str) -> dict | None:
    try:
        resp = await client.get(f"{BASE_URL}/authors/{openalex_id}", headers=HEADERS, timeout=15)
        if resp.status_code != 200:
            return None
        return resp.json()
    except Exception as e:
        print(f"  Error: {e}")
        return None


async def main():
    async with SessionLocal() as session:
        result = await session.execute(
            text("SELECT id, name, openalex_id, affiliation FROM researchers WHERE openalex_id NOT LIKE 'g_%'")
        )
        rows = result.fetchall()
        print(f"Processing {len(rows)} researchers...\n")

        async with httpx.AsyncClient(timeout=15) as client:
            for rid, name, openalex_id, current_aff in rows:
                safe_name = name.encode("ascii", "replace").decode()
                print(f"{safe_name} | {openalex_id}")

                author = await fetch_author(client, openalex_id)
                if not author:
                    print(f"  -> Could not fetch, skipping\n")
                    continue

                # Get affiliation
                aff = AFFILIATION_OVERRIDES.get(openalex_id, "")
                if not aff:
                    aff_list = author.get("affiliations", [])
                    if aff_list:
                        aff = aff_list[0].get("institution", {}).get("display_name", "")
                    if not aff:
                        last = author.get("last_known_institutions", [])
                        if last:
                            aff = last[0].get("display_name", "")

                stats = author.get("summary_stats", {})
                h_index = stats.get("h_index", 0)
                i10_index = stats.get("i10_index", 0)
                works_count = author.get("works_count", 0)
                cited_by_count = author.get("cited_by_count", 0)

                topics = [t.get("display_name", "") for t in author.get("topics", [])[:6] if t.get("display_name")]
                bio = f"Researcher with {works_count:,} publications and {cited_by_count:,} citations."

                display_name = author.get("display_name", name)
                clean_name = re.sub(r'^(Dr\.?|Prof\.?|Mr\.?|Mrs\.?|Ms\.?)\s+', '', display_name)
                photo_url = f"https://ui-avatars.com/api/?name={clean_name.replace(' ', '+')}&background=8B5E3C&color=fff&size=200"

                print(f"  -> aff: {aff[:60]}")
                print(f"  -> h={h_index} cites={cited_by_count:,} pubs={works_count}")

                await session.execute(text("""
                    UPDATE researchers
                    SET affiliation = :aff,
                        bio = :bio,
                        photo_url = :photo_url,
                        topics = :topics
                    WHERE id = :id
                """), {
                    "aff": aff,
                    "bio": bio,
                    "photo_url": photo_url,
                    "topics": json.dumps(topics),
                    "id": str(rid),
                })

                await session.execute(text("""
                    INSERT INTO raw_metrics (researcher_id, h_index, total_citations, publications, i10_index,
                        active_years, sdg_count, sdg_mean_confidence, oa_percentage, societal_mentions,
                        total_patents, books_authored, books_edited, unique_funders, patent_links, source)
                    VALUES (:id, :h_index, :total_citations, :publications, :i10_index,
                        10, 0, 0.0, 0.0, 0, 0, 0, 0, 0, 0, 'openalex')
                    ON CONFLICT (researcher_id) DO UPDATE SET
                        h_index = EXCLUDED.h_index,
                        total_citations = EXCLUDED.total_citations,
                        publications = EXCLUDED.publications,
                        i10_index = EXCLUDED.i10_index
                """), {"id": str(rid), "h_index": h_index, "total_citations": cited_by_count,
                       "publications": works_count, "i10_index": i10_index})

                print()
                await asyncio.sleep(0.15)

        await session.commit()
        print("Done!")

asyncio.run(main())
