from utils import LOGGER
from config import keys
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional


TELEGRAM_BOT_TOKEN = keys.TELEGRAM_BOT_TOKEN
USER_COLLECTION = "users"


async def check_telegram_username_exists(
    db: AsyncIOMotorDatabase,
    telegram_username: str
) -> bool:
    """
    Kiểm tra xem một telegram username có tồn tại trong USER_COLLECTION không.
    
    Args:
        db: Database instance
        telegram_username: Telegram username cần kiểm tra (không bao gồm @)
    
    Returns:
        bool: True nếu telegram username tồn tại, False nếu không
    """
    if not telegram_username or not telegram_username.strip():
        return False
    
    users_collection = db[USER_COLLECTION]
    
    # Loại bỏ @ nếu có ở đầu
    username = telegram_username.strip().lstrip('@')
    
    # Tìm user có telegram_username khớp
    user = await users_collection.find_one({
        "telegram_username": username
    })
    
    exists = user is not None
    
    if exists:
        LOGGER.debug(f"Telegram username '{username}' exists in database")
    else:
        LOGGER.debug(f"Telegram username '{username}' not found in database")
    
    return exists

