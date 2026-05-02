"""
Import 100 researchers by name from OpenAlex.
Searches by display_name, picks the best match, upserts into DB, computes GR rating.
Run: python scripts/import_researchers.py
"""
import asyncio
import json
import sys
import os
import uuid
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import httpx
from sqlalchemy import select
from app.database import async_session
from app.models.researcher import Researcher
from app.models.gr_rating import GRRating

BASE_URL = "https://api.openalex.org"
EMAIL = "ayushwalunj1@gmail.com"
HEADERS = {"User-Agent": f"GRConnect/1.0 (mailto:{EMAIL})"}

RESEARCHERS = [
    "Ketan Kotecha",
    "Nilanjan Dey",
    "Nithesh Naik",
    "Parikshit Mahalle",
    "Jagdish Chand Bansal",
    "Vijay Singh Rathore",
    "Gitanjali Shinde",
    "Dattatray Takale",
    "Mohd Shafi Pathan",
    "Sushilkumar Salve",
    "Manisha Dale",
    "Pranoti Mane",
    "Prabhakar Kota",
    "Habib Pathan",
    "Deepak Dubal",
    "Nandu Chaure",
    "Shrikant Sartale",
    "Zhanhu Guo",
    "Tossapon Boongoen",
    "Princy Randhawa",
    "Ritesh Bhat",
    "M. Tanveer",
    "Rashid Mehmood",
    "Abdulraqeb Alhammadi",
    "Nilesh Sable",
    "Sandip Thepade",
    "Deepak Mane",
    "Rahi Walambe",
    "Ganesh Pise",
    "Kanchan Tiwari",
    "Sandesh Jadkar",
    "Sheng-Lung Peng",
    "Meelis Kitsing",
    "Simon James Fong",
    "Thittaporn Ganokratanaa",
    "Milan Tuba",
    "Dharm Singh Jat",
    "Dalia Magdi",
    "Monomita Nandy",
    "Mohammad Mahyoob Albuhairy",
    "Eva Tuba",
    "Mahtab Shahin",
    "Dipankar Deb",
    "Xin-She Yang",
    "Sachin Jain",
    "Shrikant Pawar",
    "Mohammad Zeyad",
    "Nurul Nuha Abdul Molok",
    "Mizanoor Rahman",
    "Gul Erkol Bayram",
    "Satendra Kumar",
    "Sumodh Lodh",
    "Ganapati Yadav",
    "Michele Mastroianni",
    "Vishal Gour",
    "Prashant Dhotre",
    "S. Rayhan Kabir",
    "Vinitkumar Dongare",
    "Sunita Salukhe Gawali",
    "Snehal Wagh",
    "Prasad Lokhande",
    "Akbar Inamdar",
    "Sachin Babar",
    "Pankaj Chandre",
    "Sachin Sakhare",
    "Sheetal Sonawane",
    "Haribhau Bhapkar",
    "Chandrakant Lokhnade",
    "Sachin Rondiya",
    "Rajaram Mane",
    "Shashikant Patole",
    "Niyamat Beedri",
    "Jupinder Kaur",
    "Shrinivas Zanwar",
    "Vikas Kolekar",
    "Uzma Bangi",
    "Pramod K. Singh",
    "Sachin Chavan",
    "Viswanatha Reddy Allugunti",
    "Harshad Shelke",
    "Helder Aragao",
    "Hari Mohan Pandey",
    "Ajeya Anand",
    "Anjana Desai",
    "Zehra Edis",
    "Brajesh Pandey",
    "Namrata Kharate",
    "Varsha Patil",
    "Sampada Dhole",
    "Vijay Rathod",
    "Chuadhry Mujeeb Ahmed",
    "Shyamrao Gumaste",
    "Ritula Thakur",
    "Tarek Sobh",
    "Hemant Purohit",
    "Devesh Kumar Srivastava",
    "Nobert Jere",
    "Sumit Kushwaha",
    "Mohd. Saifuzzaman",
    "Fatih Ozkaynak",
    "Brahim Aksasse",
]

SDG_KEYWORD_MAP = {
    1: ["poverty"],
    2: ["hunger", "food security", "agriculture"],
    3: ["health", "medicine", "disease", "cancer", "covid", "clinical"],
    4: ["education", "learning", "teaching"],
    6: ["water", "sanitation"],
    7: ["energy", "renewable", "solar", "wind", "photovoltaic"],
    9: ["innovation", "industry", "infrastructure", "iot", "robotics", "manufacturing"],
    10: ["inequality", "inclusion"],
    11: ["cities", "urban", "smart city"],
    13: ["climate", "carbon", "emission", "environment"],
    14: ["ocean", "marine", "aquatic"],
    15: ["biodiversity", "forest", "land"],
    16: ["security", "peace", "justice", "governance"],
}


def S(x: float, c: float) -> float:
    x = max(x, 0)
    return 100 * x / (x + c)


def compute_gr_rating(works_count: int, cited_by_count: int, h_index: int,
                      i10_index: int = 0, fwci: float = 0.0,
                      citation_velocity: float = 0.0, recency_index: float = 0.0) -> tuple[float, str, float, float, float, float, float]:
    p1 = round(S(h_index, 3) * 0.30 + S(cited_by_count, 180) * 0.25 + S(works_count, 8) * 0.25 + S(i10_index, 3) * 0.20, 1)

    if fwci > 0 or citation_velocity > 0 or recency_index > 0:
        p2_fwci = S(fwci, 0.3)              if fwci > 0              else 50.0
        p2_vel  = S(citation_velocity, 12)  if citation_velocity > 0 else 50.0
        p2_rec  = S(recency_index, 0.3)     if recency_index > 0     else 50.0
        p2 = round(p2_fwci * 0.35 + p2_vel * 0.25 + p2_rec * 0.20 + 50.0 * 0.20, 1)
    else:
        p2 = 50.0

    p3 = 50.0
    p4 = 50.0
    p5 = 50.0

    gr = round(p1 * 0.25 + p2 * 0.30 + p3 * 0.15 + p4 * 0.20 + p5 * 0.10, 1)

    if gr >= 85:   tier = "GR-A"
    elif gr >= 70: tier = "GR-B"
    elif gr >= 50: tier = "GR-C"
    elif gr >= 30: tier = "GR-D"
    else:          tier = "GR-E"

    return gr, tier, p1, p2, p3, p4, p5


def extract_sdgs(data: dict, topics: list[str]) -> list[int]:
    sdg_ids = []
    for sdg in data.get("sustainable_development_goals", []):
        try:
            num = int(sdg.get("id", "").split("/")[-1])
            if 1 <= num <= 17:
                sdg_ids.append(num)
        except (ValueError, AttributeError):
            pass

    if not sdg_ids:
        topic_text = " ".join(topics).lower()
        for sdg_num, keywords in SDG_KEYWORD_MAP.items():
            if any(kw in topic_text for kw in keywords):
                sdg_ids.append(sdg_num)
        sdg_ids = sdg_ids[:5]

    return sdg_ids


async def search_author(client: httpx.AsyncClient, name: str) -> dict | None:
    resp = await client.get(
        f"{BASE_URL}/authors",
        params={"search": name, "per-page": 1},
        headers=HEADERS,
        timeout=15,
    )
    if resp.status_code != 200:
        print(f"  Search failed for {name}: HTTP {resp.status_code}")
        return None
    results = resp.json().get("results", [])
    if not results:
        print(f"  Not found: {name}")
        return None
    return results[0]


async def fetch_author(client: httpx.AsyncClient, openalex_id: str) -> dict | None:
    resp = await client.get(f"{BASE_URL}/authors/{openalex_id}", headers=HEADERS, timeout=15)
    if resp.status_code != 200:
        return None
    return resp.json()


async def run():
    async with async_session() as session:
        async with httpx.AsyncClient() as client:
            imported = 0
            skipped = 0

            for name in RESEARCHERS:
                print(f"\n[{imported+skipped+1}/100] Searching: {name}")
                author = await search_author(client, name)
                if not author:
                    skipped += 1
                    await asyncio.sleep(0.3)
                    continue

                openalex_id = author.get("id", "").split("/")[-1]
                display_name = author.get("display_name", name)
                affiliation = ""
                aff_list = author.get("affiliations", [])
                if aff_list:
                    affiliation = aff_list[0].get("institution", {}).get("display_name", "")
                if not affiliation:
                    last = author.get("last_known_institutions", [])
                    if last:
                        affiliation = last[0].get("display_name", "")

                works_count = author.get("works_count", 0)
                cited_by_count = author.get("cited_by_count", 0)
                h_index = author.get("summary_stats", {}).get("h_index", 0)
                orcid = (author.get("orcid") or "").replace("https://orcid.org/", "")

                # Topics
                topics = [t.get("display_name", "") for t in author.get("topics", [])[:6] if t.get("display_name")]

                # SDGs
                sdg_ids = extract_sdgs(author, topics)

                # Bio from abstract of most cited work (skip — use empty for now)
                bio = f"Researcher with {works_count} publications and {cited_by_count} citations."

                photo_url = f"https://ui-avatars.com/api/?name={display_name.replace(' ', '+')}&background=8B5E3C&color=fff&size=200"

                stats = author.get("summary_stats", {})
                i10_index = stats.get("i10_index", 0)
                fwci = stats.get("2yr_mean_citedness", 0.0) or 0.0
                cited_by_2yr = stats.get("2yr_cited_by_count", 0) or 0
                citation_velocity = cited_by_2yr / 2.0 if cited_by_2yr > 0 else 0.0
                counts_by_year = author.get("counts_by_year", [])
                recent_works = sum(y.get("works_count", 0) for y in counts_by_year if y.get("year", 0) >= 2020)
                recency_index = (recent_works / works_count) if works_count > 0 else 0.0

                gr_rating, tier, p1, p2, p3, p4, p5 = compute_gr_rating(
                    works_count, cited_by_count, h_index, i10_index,
                    fwci, citation_velocity, recency_index
                )

                print(f"  Found: {display_name} | {affiliation}")
                print(f"  Works: {works_count} | Citations: {cited_by_count} | H-index: {h_index}")
                print(f"  GR: {gr_rating} ({tier}) | Topics: {topics[:2]}")

                # Upsert researcher
                existing = (await session.execute(
                    select(Researcher).where(Researcher.openalex_id == openalex_id)
                )).scalar_one_or_none()

                if existing:
                    r = existing
                else:
                    r = Researcher(id=uuid.uuid4(), openalex_id=openalex_id)
                    session.add(r)

                r.name = display_name
                r.affiliation = affiliation
                r.orcid = orcid
                r.bio = bio
                r.photo_url = photo_url
                r.topics = json.dumps(topics)
                r.sdg_ids = ",".join(str(x) for x in sdg_ids)

                await session.flush()

                # Upsert GR rating
                gr_row = (await session.execute(
                    select(GRRating).where(GRRating.researcher_id == r.id)
                )).scalar_one_or_none()

                if gr_row:
                    gr_row.gr_rating = gr_rating
                    gr_row.tier = tier
                    gr_row.p1_score = p1
                    gr_row.p2_score = p2
                    gr_row.p3_score = p3
                    gr_row.p4_score = p4
                    gr_row.p5_score = p5
                else:
                    gr_row = GRRating(
                        researcher_id=r.id,
                        gr_rating=gr_rating,
                        tier=tier,
                        p1_score=p1,
                        p2_score=p2,
                        p3_score=p3,
                        p4_score=p4,
                        p5_score=p5,
                    )
                    session.add(gr_row)

                imported += 1
                await asyncio.sleep(0.4)  # polite rate limit

            await session.commit()

            # Update ranks
            all_ratings = (await session.execute(
                select(GRRating).order_by(GRRating.gr_rating.desc())
            )).scalars().all()
            for i, gr in enumerate(all_ratings, 1):
                gr.rank_overall = i
            await session.commit()

        print(f"\nDone! Imported: {imported}, Skipped: {skipped}")


if __name__ == "__main__":
    asyncio.run(run())
