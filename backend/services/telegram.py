from utils import LOGGER
from config import keys
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional
from bson import ObjectId
import requests
import asyncio


TELEGRAM_BOT_TOKEN = keys.TELEGRAM_BOT_TOKEN
USER_COLLECTION = "users"
TELEGRAM_API_URL = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"


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


async def get_user_by_telegram_username(
    db: AsyncIOMotorDatabase,
    telegram_username: str
) -> Optional[dict]:
    """
    Lấy user theo telegram username.
    
    Args:
        db: Database instance
        telegram_username: Telegram username (không bao gồm @)
    
    Returns:
        dict: User document nếu tìm thấy, None nếu không
    """
    if not telegram_username or not telegram_username.strip():
        return None
    
    users_collection = db[USER_COLLECTION]
    
    # Loại bỏ @ nếu có ở đầu
    username = telegram_username.strip().lstrip('@')
    
    # Tìm user có telegram_username khớp
    user = await users_collection.find_one({
        "telegram_username": username
    })
    
    return user


async def subscribe_telegram(
    db: AsyncIOMotorDatabase,
    telegram_username: str,
    chat_id: str
) -> bool:
    """
    Đăng ký telegram subscription cho user.
    - Lưu telegram_chat_id
    - Set telegram_subscribed = True
    
    Args:
        db: Database instance
        telegram_username: Telegram username (không bao gồm @)
        chat_id: Telegram chat ID
    
    Returns:
        bool: True nếu thành công, False nếu không tìm thấy user
    """
    users_collection = db[USER_COLLECTION]
    
    # Loại bỏ @ nếu có ở đầu
    username = telegram_username.strip().lstrip('@')
    
    # Tìm và cập nhật user
    result = await users_collection.update_one(
        {"telegram_username": username},
        {
            "$set": {
                "telegram_chat_id": chat_id,
                "telegram_subscribed": True
            }
        }
    )
    
    if result.modified_count > 0:
        LOGGER.info(f"User {username} subscribed to Telegram (chat_id: {chat_id})")
        return True
    else:
        LOGGER.warning(f"Failed to subscribe user {username} - user not found")
        return False


async def unsubscribe_telegram(
    db: AsyncIOMotorDatabase,
    telegram_username: str
) -> bool:
    """
    Hủy đăng ký telegram subscription cho user.
    - Set telegram_subscribed = False
    - Giữ nguyên telegram_chat_id (để có thể gửi thông báo sau)
    
    Args:
        db: Database instance
        telegram_username: Telegram username (không bao gồm @)
    
    Returns:
        bool: True nếu thành công, False nếu không tìm thấy user
    """
    users_collection = db[USER_COLLECTION]
    
    # Loại bỏ @ nếu có ở đầu
    username = telegram_username.strip().lstrip('@')
    
    # Tìm và cập nhật user
    result = await users_collection.update_one(
        {"telegram_username": username},
        {
            "$set": {
                "telegram_subscribed": False
            }
        }
    )
    
    if result.modified_count > 0:
        LOGGER.info(f"User {username} unsubscribed from Telegram")
        return True
    else:
        LOGGER.warning(f"Failed to unsubscribe user {username} - user not found")
        return False


async def send_telegram_message(
    chat_id: str,
    message: str,
    parse_mode: Optional[str] = None
) -> bool:
    """
    Gửi tin nhắn Telegram đến một chat_id.
    
    Args:
        chat_id: Telegram chat ID
        message: Nội dung tin nhắn
        parse_mode: Parse mode để định dạng tin nhắn. Các giá trị:
            - None (mặc định): Plain text, không định dạng
            - "HTML": Định dạng HTML
                Ví dụ: "<b>Bold</b>", "<i>Italic</i>", "<a href='url'>Link</a>"
            - "MarkdownV2": MarkdownV2 (khuyến nghị)
                Ví dụ: "*Bold*", "_Italic_", "[Link](url)"
    
    Returns:
        bool: True nếu gửi thành công, False nếu có lỗi
    
    Ví dụ sử dụng:
        # Plain text (không định dạng)
        await send_telegram_message(chat_id, "Hello World")
        
        # HTML format
        await send_telegram_message(
            chat_id,
            "<b>Đăng ký thành công!</b>\\n\\nBạn sẽ nhận được <i>thông báo</i> từ hệ thống.",
            parse_mode="HTML"
        )
        
        # MarkdownV2 format
        await send_telegram_message(
            chat_id,
            "*Đăng ký thành công!*\\n\\nBạn sẽ nhận được _thông báo_ từ hệ thống.",
            parse_mode="MarkdownV2"
        )
    """
    if not chat_id or not message:
        LOGGER.warning("Cannot send Telegram message: chat_id or message is empty")
        return False
    
    url = f"{TELEGRAM_API_URL}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": message
    }
    
    if parse_mode:
        payload["parse_mode"] = parse_mode
    
    try:
        # Sử dụng asyncio.to_thread để chạy blocking request trong thread pool
        response = await asyncio.to_thread(requests.post, url, json=payload, timeout=10)
        response.raise_for_status()
        
        result = response.json()
        if result.get("ok"):
            LOGGER.info(f"Sent Telegram message to chat_id {chat_id}")
            return True
        else:
            LOGGER.error(f"Failed to send Telegram message: {result.get('description', 'Unknown error')}")
            return False
            
    except requests.exceptions.RequestException as e:
        LOGGER.error(f"Error sending Telegram message to chat_id {chat_id}: {e}")
        return False
    except Exception as e:
        LOGGER.error(f"Unexpected error sending Telegram message: {e}")
        return False


async def send_telegram_message_to_user(
    db: AsyncIOMotorDatabase,
    user_id: str,
    message: str,
    parse_mode: Optional[str] = None,
) -> bool:
    """
    Gửi tin nhắn Telegram đến user theo user_id.
    Tự động lấy chat_id từ database.
    
    Args:
        db: Database instance
        user_id: User ID
        message: Nội dung tin nhắn
        parse_mode: Parse mode để định dạng tin nhắn:
            - None: Plain text (mặc định)
            - "HTML": HTML formatting (ví dụ: "<b>bold</b>", "<i>italic</i>")
            - "MarkdownV2": MarkdownV2 formatting (ví dụ: "*bold*", "_italic_")
    
    Returns:
        bool: True nếu gửi thành công, False nếu có lỗi
    """
    users_collection = db[USER_COLLECTION]
    
    try:
        user_id_obj = ObjectId(user_id)
    except Exception:
        user_id_obj = user_id
    
    user = await users_collection.find_one({"_id": user_id_obj})
    
    if not user:
        LOGGER.warning(f"User {user_id} not found")
        return False
    
    chat_id = user.get("telegram_chat_id")
    if not chat_id:
        LOGGER.warning(f"User {user_id} does not have telegram_chat_id")
        return False
    
    return await send_telegram_message(chat_id, message, parse_mode)

