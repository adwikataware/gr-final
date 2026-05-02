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

SEED_NAMES = {
    "sushilkumar salve", "gitanjali shinde", "jagdish c. bansal", "jagdish bansal",
    "zhanhu guo", "ketan kotecha", "ganapati yadav", "ganapati d. yadav",
    "dattatray takale", "nilanjan dey", "parikshit mahalle", "vijay singh rathore",
}


async def main():
    async with SessionLocal() as session:
        rows = (await session.execute(text(
            "SELECT id, openalex_id, name FROM researchers"
        ))).fetchall()

        to_delete = [
            (rid, oid) for rid, oid, name in rows
            if name.lower().replace("dr. ", "").replace("dr ", "").strip() not in SEED_NAMES
            and not oid.startswith("g_")
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
