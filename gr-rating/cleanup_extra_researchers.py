"""
Removes any researchers not in the approved seed list.
Keeps only the 8 manually seeded researchers + any Google-onboarded users (openalex_id starts with g_).
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

SEED_OPENALEX_IDS = {
    "A5017173320",  # Dr. Sushilkumar Salve
    "A5080409343",  # Dr. Gitanjali Shinde
    "A5023928504",  # Dr. Jagdish C. Bansal
    "A5110015262",  # Dr. Zhanhu Guo
    "A5092559347",  # Dr. Ketan Kotecha
    "A5063648631",  # Dr. Ganapati Yadav
    "A5093554874",  # Dr. Dattatray Takale
    "A5000975435",  # Nilanjan Dey
}


async def main():
    async with SessionLocal() as session:
        rows = (await session.execute(text(
            "SELECT id, openalex_id, name FROM researchers"
        ))).fetchall()

        to_delete = [
            (rid, oid) for rid, oid, name in rows
            if oid not in SEED_OPENALEX_IDS and not oid.startswith("g_")
        ]

        if not to_delete:
            print("Nothing to clean up.")
            return

        print(f"Removing {len(to_delete)} extra researchers...")
        for rid, oid in to_delete:
            await session.execute(text("DELETE FROM gr_ratings WHERE researcher_id = :id"), {"id": str(rid)})
            await session.execute(text("DELETE FROM raw_metrics WHERE researcher_id = :id"), {"id": str(rid)})
            await session.execute(text("DELETE FROM researchers WHERE id = :id"), {"id": str(rid)})

        await session.commit()
        print("Done.")


asyncio.run(main())
