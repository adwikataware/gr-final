"""
Wipes researchers/gr_ratings/raw_metrics and re-seeds from local exact data.
Run once against prod Cloud SQL via Cloud Run job or locally with prod DATABASE_URL.
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

RESEARCHERS = [
    ("0f0fec79-4927-453e-9824-dcaf78277bdc", "Dr. Sushilkumar Salve", "VIT, Pune", "A5017173320", None, None, None, "Researcher with 3 publications and 31 citations.", "https://ui-avatars.com/api/?name=Sushilkumar+S.+Salve&background=8B5E3C&color=fff&size=200", '["Biometric Identification and Security", "Face and Expression Recognition", "User Authentication and Security Systems", "Image and Video Stabilization"]', None),
    ("ca909144-c5db-41f4-9e7d-b54fdcbd65db", "Dr. Gitanjali Shinde", "VIT, Pune", "A5080409343", None, None, None, "Researcher with 214 publications and 1,128 citations.", "https://ui-avatars.com/api/?name=Gitanjali+R.+Shinde&background=8B5E3C&color=fff&size=200", '["IoT and Edge/Fog Computing", "Underwater Vehicles and Communication Systems", "Anomaly Detection Techniques and Applications", "Energy Efficient Wireless Sensor Networks", "Artificial Intelligence in Healthcare"]', None),
    ("bcf2e9b7-e4fe-45b3-a9fe-574033704992", "Dr. Jagdish C. Bansal", "National Institute Of Technology Silchar", "A5023928504", None, None, None, "Researcher with 185 publications and 5,210 citations.", "https://ui-avatars.com/api/?name=Jagdish+Chand+Bansal&background=8B5E3C&color=fff&size=200", '["Metaheuristic Optimization Algorithms Research", "Evolutionary Algorithms and Applications", "Advanced Multi-Objective Optimization Algorithms", "Multi-Criteria Decision Making", "Artificial Immune Systems Applications"]', None),
    ("28a0eb46-4587-4cba-b464-19ce762ad230", "Dr. Zhanhu Guo", "Ningbo University", "A5110015262", None, None, None, "Researcher with 1,655 publications and 144,243 citations.", "https://ui-avatars.com/api/?name=Zhanhu+Guo&background=8B5E3C&color=fff&size=200", '["Advancements in Battery Materials", "Supercapacitor Materials and Fabrication", "Advanced Battery Materials and Technologies", "Conducting polymers and applications", "Advanced Sensor and Energy Harvesting Materials"]', None),
    ("b8b0902b-2df0-4482-bf41-76821d403504", "Dr. Ketan Kotecha", "Symbiosis International University", "A5092559347", None, None, None, "Researcher with 2 publications and 8 citations.", "https://ui-avatars.com/api/?name=Ketan+Kotecha&background=8B5E3C&color=fff&size=200", '["Smart Agriculture and AI", "Spectroscopy and Chemometric Analyses", "Human Pose and Action Recognition", "Advanced Malware Detection Techniques", "Anomaly Detection Techniques and Applications"]', None),
    ("0744dc96-f7e7-4edc-8380-fc4c0eb3f25c", "Dr. Ganapati Yadav", "Institute of Chemical Technology, Mumbai", "A5063648631", None, None, None, "Researcher with 547 publications and 17,619 citations.", "https://ui-avatars.com/api/?name=Ganapati+D.+Yadav&background=8B5E3C&color=fff&size=200", '["Chemical Synthesis and Reactions", "Catalysis for Biomass Conversion", "Mesoporous Materials and Catalysis", "Enzyme Catalysis and Immobilization", "Microwave-Assisted Synthesis and Applications"]', None),
    ("2538139c-b17e-4c24-9450-56b7e3f48b07", "Dr. Dattatray Takale", "VIT, Pune", "A5093554874", None, None, None, "Researcher with 67 publications and 188 citations.", "https://ui-avatars.com/api/?name=Dattatray+G.+Takale&background=8B5E3C&color=fff&size=200", '["AI in cancer detection", "Artificial Intelligence in Healthcare", "Energy Efficient Wireless Sensor Networks", "COVID-19 diagnosis using AI", "Brain Tumor Detection and Classification"]', None),
    ("42a9c38a-0068-46f7-9d80-ee26c151661e", "Nilanjan Dey", "Techno India University, Kolkata", "A5000975435", "0000-0001-8437-498X", None, None, "Researcher with 903 publications and 19,909 citations.", "https://ui-avatars.com/api/?name=Nilanjan+Dey&background=8B5E3C&color=fff&size=200", '["Advanced Steganography and Watermarking Techniques", "Medical Image Segmentation Techniques", "Image Retrieval and Classification Techniques", "AI in cancer detection", "Brain Tumor Detection and Classification"]', "3,6"),
]

# (researcher_id, publications, total_citations, h_index, i10_index,
#  fwci, citation_velocity, recency_index, topic_prominence_cagr,
#  sdg_count, sdg_mean_confidence, oa_percentage, societal_mentions,
#  total_patents, books_authored, books_edited, unique_funders, patent_links)
RAW_METRICS = [
    ("0f0fec79-4927-453e-9824-dcaf78277bdc",   3,     31,   2,    1,  0.5,   10.0, 0.6, 20.0, 1, 0.42, 20.0,   0,  0,  0,  0,  0,  0),
    ("ca909144-c5db-41f4-9e7d-b54fdcbd65db", 214,   1128,  16,   25,  1.4,  145.0, 1.6, 25.0, 4, 0.50, 30.0,   5,  2,  3,  5,  2,  1),
    ("bcf2e9b7-e4fe-45b3-a9fe-574033704992", 185,   5210,  34,   93,  2.2,  384.0, 1.0, 18.0, 3, 0.50, 40.0,   8,  0,  2, 10,  4,  3),
    ("28a0eb46-4587-4cba-b464-19ce762ad230", 1655, 144243, 191, 1397,  3.5, 4600.0, 1.2, 22.0, 6, 0.60, 45.0, 120, 23,  5, 20, 12, 25),
    ("b8b0902b-2df0-4482-bf41-76821d403504",   2,      8,   1,    0,  3.2,  640.0, 1.5, 35.0, 5, 0.55, 55.0,  30, 22,  5,  3,  8, 12),
    ("0744dc96-f7e7-4edc-8380-fc4c0eb3f25c", 547,  17619,  66,  366,  2.5,  570.0, 0.8, 12.0, 8, 0.70, 30.0,  60, 50,  8, 10, 10, 20),
    ("2538139c-b17e-4c24-9450-56b7e3f48b07",  67,    188,   9,    6,  1.0,   57.0, 1.4, 25.0, 3, 0.48, 30.0,   3, 80,  2,  5,  2,  2),
    ("42a9c38a-0068-46f7-9d80-ee26c151661e", 903,  19909,  69,  427,  2.8, 1100.0, 1.1, 30.0, 6, 0.60, 50.0,  45,  5, 10, 30,  6,  8),
]


async def main():
    async with SessionLocal() as s:
        # Wipe existing data (keep google-onboarded users)
        await s.execute(text("""
            DELETE FROM gr_ratings WHERE researcher_id IN (
                SELECT id FROM researchers WHERE openalex_id NOT LIKE 'g_%'
            )
        """))
        await s.execute(text("""
            DELETE FROM raw_metrics WHERE researcher_id IN (
                SELECT id FROM researchers WHERE openalex_id NOT LIKE 'g_%'
            )
        """))
        await s.execute(text("DELETE FROM researchers WHERE openalex_id NOT LIKE 'g_%'"))
        await s.commit()
        print("Wiped existing non-google researchers.")

        # Insert seed researchers
        for r in RESEARCHERS:
            rid, name, affiliation, openalex_id, orcid, google_scholar_id, openalex_profile_url, bio, photo_url, topics, sdg_ids = r
            await s.execute(text("""
                INSERT INTO researchers (id, name, affiliation, openalex_id, orcid, google_scholar_id, bio, photo_url, topics, sdg_ids)
                VALUES (:id, :name, :affiliation, :openalex_id, :orcid, :gsid, :bio, :photo_url, :topics, :sdg_ids)
                ON CONFLICT (id) DO UPDATE SET
                    name=EXCLUDED.name, affiliation=EXCLUDED.affiliation,
                    openalex_id=EXCLUDED.openalex_id, bio=EXCLUDED.bio,
                    photo_url=EXCLUDED.photo_url, topics=EXCLUDED.topics, sdg_ids=EXCLUDED.sdg_ids
            """), {"id": rid, "name": name, "affiliation": affiliation, "openalex_id": openalex_id,
                   "orcid": orcid, "gsid": google_scholar_id, "bio": bio, "photo_url": photo_url,
                   "topics": topics, "sdg_ids": sdg_ids})

        # Insert raw_metrics (exact local data so recalculate_gr produces identical scores)
        for m in RAW_METRICS:
            (rid, pubs, cites, h, i10, fwci, cit_vel, rec_idx, cagr,
             sdg_c, sdg_conf, oa_pct, soc, patents, books_a, books_e, funders, pat_links) = m
            await s.execute(text("""
                INSERT INTO raw_metrics (
                    researcher_id, publications, total_citations, h_index, i10_index,
                    fwci, citation_velocity, recency_index, topic_prominence_cagr,
                    sdg_count, sdg_mean_confidence, oa_percentage, societal_mentions,
                    total_patents, books_authored, books_edited, unique_funders, patent_links
                ) VALUES (
                    :rid, :pubs, :cites, :h, :i10,
                    :fwci, :cit_vel, :rec_idx, :cagr,
                    :sdg_c, :sdg_conf, :oa_pct, :soc,
                    :patents, :books_a, :books_e, :funders, :pat_links
                )
                ON CONFLICT (researcher_id) DO UPDATE SET
                    publications=EXCLUDED.publications, total_citations=EXCLUDED.total_citations,
                    h_index=EXCLUDED.h_index, i10_index=EXCLUDED.i10_index,
                    fwci=EXCLUDED.fwci, citation_velocity=EXCLUDED.citation_velocity,
                    recency_index=EXCLUDED.recency_index, topic_prominence_cagr=EXCLUDED.topic_prominence_cagr,
                    sdg_count=EXCLUDED.sdg_count, sdg_mean_confidence=EXCLUDED.sdg_mean_confidence,
                    oa_percentage=EXCLUDED.oa_percentage, societal_mentions=EXCLUDED.societal_mentions,
                    total_patents=EXCLUDED.total_patents, books_authored=EXCLUDED.books_authored,
                    books_edited=EXCLUDED.books_edited, unique_funders=EXCLUDED.unique_funders,
                    patent_links=EXCLUDED.patent_links
            """), {"rid": rid, "pubs": pubs, "cites": cites, "h": h, "i10": i10,
                   "fwci": fwci, "cit_vel": cit_vel, "rec_idx": rec_idx, "cagr": cagr,
                   "sdg_c": sdg_c, "sdg_conf": sdg_conf, "oa_pct": oa_pct, "soc": soc,
                   "patents": patents, "books_a": books_a, "books_e": books_e,
                   "funders": funders, "pat_links": pat_links})

        await s.commit()
        print(f"Seeded {len(RESEARCHERS)} researchers + raw_metrics. recalculate_gr will now produce exact local scores.")


asyncio.run(main())
