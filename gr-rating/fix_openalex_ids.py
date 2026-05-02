"""
Re-search every researcher on OpenAlex by name and pick the best match
(highest cited_by_count among top results). Updates openalex_id + raw_metrics.
Run: python fix_openalex_ids.py
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


def strip_honorifics(name: str) -> str:
    return re.sub(r'^(Dr\.?|Prof\.?|Mr\.?|Mrs\.?|Ms\.?)\s+', '', name).strip()


async def search_openalex(client: httpx.AsyncClient, name: str, affiliation: str) -> dict | None:
    clean = strip_honorifics(name)

    # Search top 5 by name, pick highest citations
    resp = await client.get(
        f"{BASE_URL}/authors",
        params={"search": clean, "per-page": "5"},
        headers=HEADERS,
        timeout=15,
    )
    if resp.status_code != 200:
        return None

    results = resp.json().get("results", [])
    if not results:
        return None

    # Score each candidate: prefer name match + affiliation match + high citations
    def score(a: dict) -> int:
        s = a.get("cited_by_count", 0)
        # Bonus if affiliation keyword matches
        aff_str = " ".join(
            i.get("institution", {}).get("display_name", "")
            for i in (a.get("affiliations") or a.get("last_known_institutions") or [])
        ).lower()
        for word in affiliation.lower().split():
            if len(word) > 3 and word in aff_str:
                s += 50000  # strong affiliation bonus
        return s

    best = max(results, key=score)
    openalex_id = best.get("id", "").split("/")[-1]
    stats = best.get("summary_stats", {})

    aff = ""
    aff_list = best.get("affiliations", [])
    if aff_list:
        aff = aff_list[0].get("institution", {}).get("display_name", "")
    if not aff:
        last = best.get("last_known_institutions", [])
        if last:
            aff = last[0].get("display_name", "")

    topics = [t.get("display_name", "") for t in best.get("topics", [])[:6] if t.get("display_name")]
    works_count = best.get("works_count", 0)
    cited_by_count = best.get("cited_by_count", 0)
    h_index = stats.get("h_index", 0)
    i10_index = stats.get("i10_index", 0)

    clean_name = best.get("display_name", clean)
    for prefix in ["Dr. ", "Prof. ", "Mr. ", "Mrs. ", "Ms. ", "Dr ", "Prof "]:
        clean_name = clean_name.replace(prefix, "")
    photo_url = f"https://ui-avatars.com/api/?name={clean_name.replace(' ', '+')}&background=8B5E3C&color=fff&size=200"
    bio = f"Researcher with {works_count:,} publications and {cited_by_count:,} citations."

    return {
        "openalex_id": openalex_id,
        "display_name": best.get("display_name", name),
        "affiliation": aff,
        "bio": bio,
        "photo_url": photo_url,
        "topics": json.dumps(topics),
        "h_index": h_index,
        "total_citations": cited_by_count,
        "publications": works_count,
        "i10_index": i10_index,
    }


async def main():
    async with SessionLocal() as session:
        result = await session.execute(
            text("SELECT id, name, openalex_id, affiliation FROM researchers WHERE openalex_id NOT LIKE 'g_%'")
        )
        rows = result.fetchall()
        print(f"Checking {len(rows)} researchers...\n")

        async with httpx.AsyncClient(timeout=15) as client:
            for rid, name, old_id, affiliation in rows:
                safe_name = name.encode("ascii", "replace").decode()
                print(f"{safe_name} | old_id={old_id}")

                data = await search_openalex(client, name, affiliation or "")
                if not data:
                    print(f"  -> No results found, skipping\n")
                    continue

                new_id = data["openalex_id"]
                changed = new_id != old_id
                print(f"  -> new_id={new_id} {'(CHANGED)' if changed else '(same)'}")
                print(f"  -> h={data['h_index']} cites={data['total_citations']:,} pubs={data['publications']}")
                print(f"  -> affil: {data['affiliation'][:60]}")

                # Update researcher
                await session.execute(
                    text("""
                        UPDATE researchers
                        SET openalex_id = :openalex_id,
                            bio = :bio,
                            photo_url = :photo_url,
                            topics = :topics,
                            affiliation = CASE WHEN :affiliation != '' THEN :affiliation ELSE affiliation END
                        WHERE id = :id
                    """),
                    {
                        "openalex_id": new_id,
                        "bio": data["bio"],
                        "photo_url": data["photo_url"],
                        "topics": data["topics"],
                        "affiliation": data["affiliation"],
                        "id": str(rid),
                    }
                )

                # Upsert raw_metrics
                await session.execute(
                    text("""
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
                    """),
                    {"id": str(rid), "h_index": data["h_index"], "total_citations": data["total_citations"],
                     "publications": data["publications"], "i10_index": data["i10_index"]}
                )
                print()
                await asyncio.sleep(0.2)

        await session.commit()
        print("Done!")


asyncio.run(main())
