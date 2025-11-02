from fastapi import FastAPI, Request
import httpx
import asyncio

# --- Cấu hình ---
API_URL = f"https://api.telegram.org/bot{BOT_TOKEN}"

app = FastAPI(title="Telegram Webhook Receiver")

# --- Route gốc để test ---
@app.get("/")
async def home():
    return {"status": "ok", "message": "Telegram Bot Webhook is running."}

# --- Webhook Telegram ---
@app.post("/webhook")
async def telegram_webhook(request: Request):
    data = await request.json()
    print("🔹 New message:", data)

    print("🔹 Data:", data)

    # Kiểm tra xem có message không (Telegram đôi khi gửi update loại khác)
    if "message" not in data:
        return {"ok": True}

    message = data["message"]
    chat_id = message["chat"]["id"]
    text = message.get("text", "")

    # Xử lý nội dung tin nhắn (ví dụ echo lại)
    reply_text = f"Bạn vừa nói: {text}"

    # Gửi phản hồi ngược lại cho user
    async with httpx.AsyncClient() as client:
        await client.post(f"{API_URL}/sendMessage", json={
            "chat_id": chat_id,
            "text": reply_text
        })

    return {"ok": True}