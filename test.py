import asyncio
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URI = "mongodb://quyetnn:nnq962@localhost:27017/face-recognition?authSource=face-recognition"
DB_NAME = "face-recognition"

async def fix_user_ids():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    attendances = db["attendances"]

    cursor = attendances.find({})
    total = 0
    updated = 0

    async for doc in cursor:
        total += 1
        _id = doc["_id"]
        user_id = doc.get("user_id")

        # Bỏ qua nếu đã là ObjectId
        if isinstance(user_id, ObjectId):
            continue

        # Thử convert string -> ObjectId
        try:
            new_user_id = ObjectId(user_id)
        except Exception as e:
            print(f"⚠️ Bỏ qua record {_id} vì user_id không hợp lệ: {user_id} ({e})")
            continue

        # Cập nhật lại document
        await attendances.update_one(
            {"_id": _id},
            {"$set": {"user_id": new_user_id}}
        )
        updated += 1
        print(f"✅ Updated {_id} | user_id = {new_user_id}")

    print(f"\n✅ Hoàn tất: {updated}/{total} records đã được cập nhật")

asyncio.run(fix_user_ids())