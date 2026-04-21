"""Seed 10 calibration researchers, compute scores, store in DB."""
import asyncio
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select
from app.database import async_session
from app.models.researcher import Researcher
from app.models.raw_metrics import RawMetrics
from app.models.gr_rating import GRRating
from app.scoring.pillar1 import pillar1_score
from app.scoring.pillar2 import pillar2_score
from app.scoring.pillar3 import pillar3_score
from app.scoring.pillar4 import pillar4_score
from app.scoring.pillar5 import pillar5_score
from app.scoring.composite import compute_gr_rating

# Calibration data from IMPLEMENTATION_PLAN.md
RESEARCHERS = [
    {
        "name": "Dr. Zhanhu Guo",
        "affiliation": "University of Tennessee, Knoxville",
        "openalex_id": "A5006593782",
        "metrics": dict(h_index=130, total_citations=115000, publications=1327, i10_index=900,
                        fwci=3.5, citation_velocity=4600, recency_index=1.2, topic_prominence_cagr=22, active_years=15,
                        sdg_count=6, sdg_mean_confidence=0.6, oa_percentage=45, societal_mentions=120,
                        total_patents=23, books_authored=5, books_edited=20, unique_funders=12, patent_links=25),
    },
    {
        "name": "Dr. Ketan Kotecha",
        "affiliation": "Symbiosis International University, Pune",
        "openalex_id": "A5023888391",
        "metrics": dict(h_index=55, total_citations=16000, publications=500, i10_index=200,
                        fwci=3.2, citation_velocity=640, recency_index=1.5, topic_prominence_cagr=35, active_years=20,
                        sdg_count=5, sdg_mean_confidence=0.55, oa_percentage=55, societal_mentions=30,
                        total_patents=22, books_authored=5, books_edited=3, unique_funders=8, patent_links=12),
    },
    {
        "name": "Dr. Ganapati Yadav",
        "affiliation": "Institute of Chemical Technology, Mumbai",
        "openalex_id": "A5046451498",
        "metrics": dict(h_index=70, total_citations=20559, publications=550, i10_index=300,
                        fwci=2.5, citation_velocity=570, recency_index=0.8, topic_prominence_cagr=12, active_years=35,
                        sdg_count=8, sdg_mean_confidence=0.7, oa_percentage=30, societal_mentions=60,
                        total_patents=50, books_authored=8, books_edited=10, unique_funders=10, patent_links=20),
    },
    {
        "name": "Dr. Nilanjan Dey",
        "affiliation": "Techno India College of Technology, Kolkata",
        "openalex_id": "A5041553704",
        "metrics": dict(h_index=72, total_citations=27491, publications=800, i10_index=380,
                        fwci=2.8, citation_velocity=1100, recency_index=1.1, topic_prominence_cagr=30, active_years=15,
                        sdg_count=6, sdg_mean_confidence=0.6, oa_percentage=50, societal_mentions=45,
                        total_patents=5, books_authored=10, books_edited=30, unique_funders=6, patent_links=8),
    },
    {
        "name": "Dr. Parikshit Mahalle",
        "affiliation": "VIT, Pune",
        "openalex_id": "A5057637126",
        "metrics": dict(h_index=29, total_citations=4715, publications=440, i10_index=75,
                        fwci=1.6, citation_velocity=188, recency_index=1.3, topic_prominence_cagr=25, active_years=18,
                        sdg_count=5, sdg_mean_confidence=0.55, oa_percentage=35, societal_mentions=12,
                        total_patents=117, books_authored=15, books_edited=60, unique_funders=5, patent_links=10),
    },
    {
        "name": "Dr. Jagdish C. Bansal",
        "affiliation": "South Asian University, New Delhi",
        "openalex_id": "A5002270857",
        "metrics": dict(h_index=34, total_citations=5768, publications=183, i10_index=65,
                        fwci=2.2, citation_velocity=384, recency_index=1.0, topic_prominence_cagr=18, active_years=15,
                        sdg_count=3, sdg_mean_confidence=0.5, oa_percentage=40, societal_mentions=8,
                        total_patents=0, books_authored=2, books_edited=10, unique_funders=4, patent_links=3),
    },
    {
        "name": "Dr. Gitanjali Shinde",
        "affiliation": "VIT, Pune",
        "openalex_id": "A5090732965",
        "metrics": dict(h_index=17, total_citations=1166, publications=113, i10_index=25,
                        fwci=1.4, citation_velocity=145, recency_index=1.6, topic_prominence_cagr=25, active_years=12,
                        sdg_count=4, sdg_mean_confidence=0.5, oa_percentage=30, societal_mentions=5,
                        total_patents=2, books_authored=3, books_edited=5, unique_funders=2, patent_links=1),
    },
    {
        "name": "Dr. Vijay S. Rathore",
        "affiliation": "Government Engineering College, Rajasthan",
        "openalex_id": "A5068297265",
        "metrics": dict(h_index=13, total_citations=616, publications=94, i10_index=16,
                        fwci=0.8, citation_velocity=30, recency_index=0.9, topic_prominence_cagr=12, active_years=15,
                        sdg_count=2, sdg_mean_confidence=0.42, oa_percentage=20, societal_mentions=2,
                        total_patents=0, books_authored=5, books_edited=5, unique_funders=2, patent_links=0),
    },
    {
        "name": "Dr. Dattatray Takale",
        "affiliation": "VIT, Pune",
        "openalex_id": "A5035479395",
        "metrics": dict(h_index=13, total_citations=688, publications=100, i10_index=15,
                        fwci=1.0, citation_velocity=57, recency_index=1.4, topic_prominence_cagr=25, active_years=10,
                        sdg_count=3, sdg_mean_confidence=0.48, oa_percentage=30, societal_mentions=3,
                        total_patents=80, books_authored=2, books_edited=5, unique_funders=2, patent_links=2),
    },
    {
        "name": "Dr. Sushilkumar Salve",
        "affiliation": "VIT, Pune",
        "openalex_id": "A5038220757",
        "metrics": dict(h_index=4, total_citations=49, publications=15, i10_index=2,
                        fwci=0.5, citation_velocity=10, recency_index=0.6, topic_prominence_cagr=20, active_years=8,
                        sdg_count=1, sdg_mean_confidence=0.42, oa_percentage=20, societal_mentions=0,
                        total_patents=0, books_authored=0, books_edited=0, unique_funders=0, patent_links=0),
    },
]


async def seed():
    async with async_session() as session:
        # Clear existing data
        for model in [GRRating, RawMetrics, Researcher]:
            existing = (await session.execute(select(model))).scalars().all()
            for obj in existing:
                await session.delete(obj)
        await session.commit()

        all_ratings = []

        for data in RESEARCHERS:
            m = data["metrics"]

            # Create researcher
            researcher = Researcher(
                name=data["name"],
                affiliation=data["affiliation"],
                openalex_id=data["openalex_id"],
            )
            session.add(researcher)
            await session.flush()

            # Store raw metrics
            raw = RawMetrics(researcher_id=researcher.id, **m)
            session.add(raw)

            # Compute scores
            p1 = pillar1_score(m["h_index"], m["total_citations"], m["publications"], m["i10_index"])
            p2 = pillar2_score(m["fwci"], m["citation_velocity"], m["recency_index"],
                               m["topic_prominence_cagr"], m["active_years"])
            p3 = pillar3_score(m["sdg_count"], m["sdg_mean_confidence"], m["oa_percentage"], m["societal_mentions"])
            p4 = pillar4_score(m["total_patents"], m["books_authored"], m["books_edited"],
                               m["unique_funders"], m["patent_links"])
            p5 = pillar5_score()
            gr = compute_gr_rating(p1["p1_score"], p2["p2_score"], p3["p3_score"], p4["p4_score"], p5["p5_score"])

            rating = GRRating(
                researcher_id=researcher.id,
                p1_score=p1["p1_score"],
                p2_score=p2["p2_score"],
                p3_score=p3["p3_score"],
                p4_score=p4["p4_score"],
                p5_score=p5["p5_score"],
                gr_rating=gr["gr_rating"],
                tier=gr["tier"],
            )
            session.add(rating)
            all_ratings.append((data["name"], p1["p1_score"], p2["p2_score"],
                                p3["p3_score"], p4["p4_score"], gr["gr_rating"], gr["tier"]))

        # Compute ranks
        all_ratings.sort(key=lambda x: x[5], reverse=True)

        await session.commit()

        # Update ranks
        for rank, (name, *_) in enumerate(all_ratings, 1):
            stmt = select(Researcher).where(Researcher.name == name)
            r = (await session.execute(stmt)).scalar_one()
            gr_obj = await session.get(GRRating, r.id)
            gr_obj.rank_overall = rank

        await session.commit()

    # Print summary
    print(f"\n{'Name':<30} {'P1':>6} {'P2':>6} {'P3':>6} {'P4':>6} {'GR':>6} {'Tier':>5} {'Rank':>4}")
    print("-" * 95)
    for rank, (name, p1, p2, p3, p4, gr, tier) in enumerate(all_ratings, 1):
        print(f"{name:<30} {p1:>6.1f} {p2:>6.1f} {p3:>6.1f} {p4:>6.1f} {gr:>6.1f} {tier:>5} {rank:>4}")
    print(f"\nSeeded {len(all_ratings)} researchers.")


if __name__ == "__main__":
    asyncio.run(seed())
