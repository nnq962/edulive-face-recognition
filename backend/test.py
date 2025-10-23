# backend/test.py
import asyncio
from backend.database.client import connect, close, get_db

async def main():
    try:
        await connect()
        db = get_db()
        pong = await db.command("ping")
        print("✅ MongoDB connected successfully:", pong)
    except Exception as e:
        print("❌ Error:", e)
    finally:
        await close()

if __name__ == "__main__":
    asyncio.run(main())