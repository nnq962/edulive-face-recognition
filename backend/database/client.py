from motor.motor_asyncio import AsyncIOMotorClient
from core.setting import settings

_client: AsyncIOMotorClient | None = None
_db = None

async def connect() -> None:
    global _client, _db
    _client = AsyncIOMotorClient(settings.MONGODB_URI)
    _db = _client[settings.MONGODB_NAME]

async def close() -> None:
    global _client
    if _client:
        _client.close()

def get_db():
    if _db is None:
        raise RuntimeError("DB not initialized. Did you call connect() in lifespan?")
    return _db