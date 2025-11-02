# backend/routes/telegram.py

from fastapi import APIRouter, Depends, Request
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Dict, Any
from unidecode import unidecode
from utils import LOGGER
from config.dependencies import get_db
from backend.services.telegram import (
    get_user_by_telegram_username,
    subscribe_telegram,
    unsubscribe_telegram,
    send_telegram_message,
)


router = APIRouter(prefix="/api/telegram", tags=["Telegram"])


# ==================== Commands Definition ====================

SUBSCRIBE_COMMAND = "Đăng ký"
UNSUBSCRIBE_COMMAND = "Hủy đăng ký"
HELP_COMMAND = "Help"

def normalize_command(text: str) -> str:
    """
    Chuẩn hóa lệnh để so sánh không phân biệt hoa thường và dấu.
    - Chuyển thành lowercase
    - Loại bỏ dấu tiếng Việt bằng unidecode
    """
    if not text:
        return ""
    
    # Loại bỏ dấu và chuyển thành lowercase
    # unidecode sẽ chuyển "Đăng ký" -> "Dang ky", "Hủy" -> "Huy"
    normalized = unidecode(text).lower().strip()
    
    return normalized


def matches_command(text: str, command: str) -> bool:
    """
    Kiểm tra xem text có khớp với command không (case-insensitive, không dấu).
    """
    return normalize_command(text) == normalize_command(command)

# ==================== Telegram Webhook API ====================

@router.post("/webhook")
async def telegram_webhook(
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Nhận webhook từ Telegram và xử lý tin nhắn.
    
    Flow:
    1. Kiểm tra xem telegram username có tồn tại trong DB không
    2. Nếu không → Phản hồi yêu cầu cấu hình telegram username trước
    3. Nếu có → Kiểm tra message:
       - "Đăng ký" → Lưu chat_id và set subscribed = True
       - "Hủy đăng ký" → Set subscribed = False
    """
    
    try:
        # Parse JSON từ request
        update: Dict[str, Any] = await request.json()
        
        # Kiểm tra có message không
        if "message" not in update:
            LOGGER.debug("Received Telegram update without message")
            return {"ok": True}
        
        message = update["message"]
        
        # Chỉ xử lý tin nhắn từ private chat (không phải group/channel)
        chat = message.get("chat", {})
        if chat.get("type") != "private":
            LOGGER.debug(f"Ignoring message from non-private chat: {chat.get('type')}")
            return {"ok": True}
        
        # Kiểm tra có từ user không (có thể là từ bot hoặc system)
        if "from" not in message:
            LOGGER.debug("Received message without from")
            return {"ok": True}
        
        # Lấy thông tin user
        telegram_user = message["from"]
        telegram_username = telegram_user.get("username")
        chat_id = str(chat.get("id"))
        
        # Kiểm tra có text message không
        if "text" not in message:
            LOGGER.debug(f"Received non-text message from {telegram_username}")
            return {"ok": True}
        
        text = message["text"].strip()
    
        
        # Kiểm tra telegram username có trong DB không
        if not telegram_username:
            LOGGER.warning(f"Received message from user without username (chat_id: {chat_id})")
            await send_telegram_message(
                chat_id,
                "⚠️ Xin lỗi, bạn chưa có Telegram username. Vui lòng cấu hình Telegram username trong tài khoản của bạn trước khi sử dụng bot này."
            )
            return {"ok": True}
        
        user = await get_user_by_telegram_username(db, telegram_username)
        
        if not user:
            # User không tồn tại trong DB
            LOGGER.warning(f"Telegram username {telegram_username} not found in database")
            await send_telegram_message(
                chat_id,
                "⚠️ Telegram username của bạn chưa được đăng ký trong hệ thống.\n\n"
                "Vui lòng truy cập cài đặt tài khoản để cấu hình Telegram username trong tài khoản của bạn trước khi sử dụng bot này."
            )
            return {"ok": True}
        
        # Lấy trạng thái subscribed hiện tại
        is_subscribed = user.get("telegram_subscribed", False)
        
        # User tồn tại, xử lý các lệnh (case-insensitive)
        if matches_command(text, SUBSCRIBE_COMMAND):
            # Đăng ký
            if is_subscribed:
                # Đã đăng ký rồi
                await send_telegram_message(
                    chat_id,
                    "ℹ️ Bạn đã đăng ký nhận thông báo trước đó.\n\n"
                    "Bạn sẽ tiếp tục nhận được thông báo từ hệ thống."
                )
                LOGGER.info(f"User {telegram_username} already subscribed")
            else:
                # Chưa đăng ký, thực hiện đăng ký
                success = await subscribe_telegram(db, telegram_username, chat_id)
                
                if success:
                    await send_telegram_message(
                        chat_id,
                        "✅ Đăng ký thành công! Bạn sẽ nhận được thông báo từ hệ thống."
                    )
                    LOGGER.info(f"User {telegram_username} successfully subscribed")
                else:
                    await send_telegram_message(
                        chat_id,
                        "❌ Đăng ký thất bại. Vui lòng thử lại sau."
                    )
                    LOGGER.error(f"Failed to subscribe user {telegram_username}")
        
        elif matches_command(text, UNSUBSCRIBE_COMMAND):
            # Hủy đăng ký
            if not is_subscribed:
                # Chưa đăng ký
                await send_telegram_message(
                    chat_id,
                    "ℹ️ Bạn chưa đăng ký nhận thông báo.\n\n"
                    "Gõ \"Đăng ký\" để bắt đầu nhận thông báo từ hệ thống."
                )
                LOGGER.info(f"User {telegram_username} tried to unsubscribe but was not subscribed")
            else:
                # Đã đăng ký, thực hiện hủy đăng ký
                success = await unsubscribe_telegram(db, telegram_username)
                
                if success:
                    await send_telegram_message(
                        chat_id,
                        "✅ Đã hủy đăng ký thành công. Bạn sẽ không còn nhận được thông báo từ hệ thống."
                    )
                    LOGGER.info(f"User {telegram_username} successfully unsubscribed")
                else:
                    await send_telegram_message(
                        chat_id,
                        "❌ Hủy đăng ký thất bại. Vui lòng thử lại sau."
                    )
                    LOGGER.error(f"Failed to unsubscribe user {telegram_username}")
        
        elif matches_command(text, HELP_COMMAND):
            # Hiển thị help
            await send_telegram_message(
                chat_id,
                "📋 Các lệnh được hỗ trợ:\n\n"
                f"• {SUBSCRIBE_COMMAND} - Đăng ký nhận thông báo từ hệ thống\n"
                f"• {UNSUBSCRIBE_COMMAND} - Hủy đăng ký nhận thông báo\n"
                f"• {HELP_COMMAND} - Xem danh sách các lệnh này\n\n"
                "💡 Bạn có thể gõ lệnh không phân biệt hoa thường."
            )
            LOGGER.debug(f"User {telegram_username} requested help")
        
        else:
            # Tin nhắn không phải lệnh hợp lệ
            LOGGER.debug(f"Unknown command from {telegram_username}: {text}")
            await send_telegram_message(
                chat_id,
                "❓ Xin lỗi, tôi không hiểu lệnh này.\n\n"
                f"Gõ \"{HELP_COMMAND}\" để xem các lệnh đang được hỗ trợ."
            )
        
        return {"ok": True}
    
    except Exception as e:
        LOGGER.error(f"Error processing Telegram webhook: {e}")
        return {"ok": False, "error": str(e)}


@router.get("/webhook/info")
async def webhook_info():
    """
    Thông tin về webhook endpoint.
    """
    return {
        "webhook_url": "/api/telegram/webhook",
        "commands": {
            "subscribe": SUBSCRIBE_COMMAND,
            "unsubscribe": UNSUBSCRIBE_COMMAND,
            "help": HELP_COMMAND,
        },
        "description": "Endpoint để nhận webhook từ Telegram Bot",
        "note": "Lệnh không phân biệt hoa thường và dấu"
    }

