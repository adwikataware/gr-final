"""
Recalculates GR scores for all researchers using the proper saturation formula.
Run: python recalculate_gr.py
"""
import asyncio, os
from dotenv import load_dotenv
load_dotenv()
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

DATABASE_URL = os.environ["DATABASE_URL"]
engine = create_async_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


def S(x: float, c: float) -> float:
    x = max(x, 0)
    return 100 * x / (x + c)


def compute_gr(works_count, cited_by_count, h_index, i10_index=0,
               total_patents=0, books_authored=0, books_edited=0,
               unique_funders=0, patent_links=0,
               sdg_count=0, sdg_mean_confidence=0.0,
               oa_percentage=0.0, societal_mentions=0):

    # P1 — Core Fundamental Research (25%)
    p1 = round(
        S(h_index, 0.5) * 0.30 +
        S(cited_by_count, 180) * 0.25 +
        S(works_count, 8) * 0.25 +
        S(i10_index, 0.5) * 0.20, 1
    )

    # P2 — Real-Time Performance (30%) — neutral until FWCI/velocity data available
    p2 = 50.0

    # P3 — Sustainability & Societal Impact (15%)
    p3 = round(
        S(sdg_count, 1.5) * 0.25 +
        S(sdg_mean_confidence, 0.18) * 0.25 +
        S(oa_percentage, 10) * 0.25 +
        S(societal_mentions, 4) * 0.25, 1
    )

    # P4 — Innovation & Economic Assets (20%)
    books_score = books_authored + 0.5 * books_edited
    p4 = round(
        S(total_patents, 2.5) * 0.30 +
        S(books_score, 2) * 0.25 +
        S(unique_funders, 1.2) * 0.25 +
        S(patent_links, 2) * 0.20, 1
    )

    # P5 — Community & Peer Recognition (10%) — neutral 50
    p5 = 50.0

    gr = round(p1 * 0.25 + p2 * 0.30 + p3 * 0.15 + p4 * 0.20 + p5 * 0.10, 1)

    if gr >= 85:   tier = "GR-A"
    elif gr >= 70: tier = "GR-B"
    elif gr >= 50: tier = "GR-C"
    elif gr >= 30: tier = "GR-D"
    else:          tier = "GR-E"

    return gr, tier, p1, p2, p3, p4, p5


async def main():
    async with SessionLocal() as session:
        rows = (await session.execute(text("""
            SELECT r.id, rm.publications, rm.total_citations, rm.h_index, rm.i10_index,
                   rm.total_patents, rm.books_authored, rm.books_edited,
                   rm.unique_funders, rm.patent_links,
                   rm.sdg_count, rm.sdg_mean_confidence, rm.oa_percentage, rm.societal_mentions
            FROM researchers r
            JOIN raw_metrics rm ON rm.researcher_id = r.id
        """))).fetchall()

        print(f"Recalculating {len(rows)} researchers...\n")
        for row in rows:
            rid, pubs, cites, h, i10, patents, books_a, books_e, funders, pat_links, sdg_c, sdg_conf, oa_pct, soc = row
            gr, tier, p1, p2, p3, p4, p5 = compute_gr(
                pubs or 0, cites or 0, h or 0, i10 or 0,
                patents or 0, books_a or 0, books_e or 0,
                funders or 0, pat_links or 0,
                sdg_c or 0, sdg_conf or 0.0, oa_pct or 0.0, soc or 0
            )
            await session.execute(text("""
                UPDATE gr_ratings
                SET gr_rating = :gr, tier = :tier,
                    p1_score = :p1, p2_score = :p2, p3_score = :p3,
                    p4_score = :p4, p5_score = :p5
                WHERE researcher_id = :id
            """), {"gr": gr, "tier": tier, "p1": p1, "p2": p2,
                   "p3": p3, "p4": p4, "p5": p5, "id": str(rid)})
            print(f"  GR={gr} ({tier})  P1={p1} P2={p2} P3={p3} P4={p4} P5={p5}")

        await session.commit()
        print("\nDone!")


asyncio.run(main())
