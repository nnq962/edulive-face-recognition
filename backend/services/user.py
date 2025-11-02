# backend/services/user.py

import os
from motor.motor_asyncio import AsyncIOMotorDatabase
from backend.schemas.user import UserCreate, UserUpdate, UserUpdateResponse
from backend.models.user import UserModel
from backend.utils.password import hash_password, verify_password
from backend.utils.pagination import PaginationParams
from backend.utils.filters import UserFilterParams
from backend.services.insightface import detect_faces, get_face_embeddings
from utils import LOGGER
import re
from unidecode import unidecode
from utils.common import normalize_mongo_doc
from config import paths
from bson import ObjectId
from utils.time_helper import utc_now
from PIL import Image
import time
import shutil
import pillow_heif
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from fastapi import UploadFile, HTTPException
import asyncio
import numpy as np


USER_COLLECTION = "users"
DEFAULT_PASSWORD = "123456"
EMAIL_DOMAIN = "@edulive.net"


def generate_username_from_fullname(full_name: str) -> str:
    """
    Sinh username từ họ tên
    
    Logic:
    - Lấy tên cuối cùng (viết thường, không dấu)
    - Thêm chữ cái đầu của các từ còn lại (viết thường, không dấu)
    
    Examples:
        "Nguyễn Văn A" → "anv"
        "Nguyễn Ngọc Quyết" → "quyetnn"
        "Nguyễn Đạt" → "datn"
        "Hưng" → "hung"
        "Trần Thị Thu Hằng" → "hangttt"
    
    Args:
        full_name: Họ tên đầy đủ
    
    Returns:
        str: Username
    """
    # Remove extra spaces và split
    words = full_name.strip().split()
    
    if not words:
        raise ValueError("Họ tên không hợp lệ")
    
    # Convert sang không dấu, viết thường
    words = [unidecode(word).lower() for word in words]
    
    if len(words) == 1:
        # Chỉ có 1 từ (ví dụ: "Hưng")
        username = words[0]
    else:
        # Lấy tên cuối cùng
        last_name = words[-1]
        
        # Lấy chữ cái đầu của các từ còn lại
        initials = ''.join([word[0] for word in words[:-1]])
        
        # Kết hợp: tên + initials
        username = last_name + initials
    
    # Remove special characters (chỉ giữ a-z, 0-9)
    username = re.sub(r'[^a-z0-9]', '', username)
    
    LOGGER.debug(f"Generated username from '{full_name}': {username}")
    
    return username


async def find_unique_username(db: AsyncIOMotorDatabase, base_username: str) -> str:
    """
    Tìm username unique (không trùng trong DB)
    Nếu trùng thì thêm số: username2, username3, ...
    
    Args:
        db: Database instance
        base_username: Username gốc
    
    Returns:
        str: Username unique
    """
    users_collection = db[USER_COLLECTION]
    
    username = base_username
    counter = 2
    
    while True:
        # Check username có tồn tại không
        existing_user = await users_collection.find_one({"username": username})
        
        if not existing_user:
            # Username này chưa có ai dùng
            LOGGER.info(f"Found unique username: {username}")
            return username
        
        # Username đã tồn tại, thử username + số
        username = f"{base_username}{counter}"
        counter += 1
        
        LOGGER.debug(f"Username '{base_username}' exists, trying: {username}")


def generate_email(username: str) -> str:
    """
    Sinh email từ username
    
    Args:
        username: Username
    
    Returns:
        str: Email
    """
    return f"{username}{EMAIL_DOMAIN}"


async def create_user(db: AsyncIOMotorDatabase, user_data: UserCreate) -> dict:
    """
    Tạo user mới
    
    Args:
        db: Database instance
        user_data: Dữ liệu user từ request
    
    Returns:
        dict: User document đã tạo
    
    Raises:
        Exception: Nếu có lỗi khi tạo user
    """
    try:
        users_collection = db[USER_COLLECTION]
        
        # 1. Sinh username từ full_name
        base_username = generate_username_from_fullname(user_data.full_name)
        
        # 2. Tìm username unique (không trùng)
        username = await find_unique_username(db, base_username)
        
        # 3. Sinh email từ username
        email = generate_email(username)
        
        # 4. Kiểm tra telegram_username unique (nếu có)
        telegram_username = None
        if user_data.telegram_username and user_data.telegram_username.strip():
            # Loại bỏ @ nếu có ở đầu
            telegram_username = user_data.telegram_username.strip().lstrip('@')
            
            # Kiểm tra xem có user nào đã sử dụng telegram_username này chưa
            existing_user_with_telegram = await users_collection.find_one({
                "telegram_username": telegram_username
            })
            
            if existing_user_with_telegram:
                LOGGER.warning(
                    f"Telegram username {telegram_username} already exists for user "
                    f"{existing_user_with_telegram.get('_id')}"
                )
                raise HTTPException(
                    status_code=400,
                    detail=f"Telegram username {telegram_username} already exists"
                )
        
        # 5. Hash password mặc định
        hashed_password = hash_password(DEFAULT_PASSWORD)
        
        # 6. Tạo user document
        new_user = UserModel(
            username=username,
            email=email,
            password=hashed_password,
            full_name=user_data.full_name,
            role=user_data.role,
            position=user_data.position,
            department=user_data.department,
            telegram_username=telegram_username,
        )

        # 7. Insert vào database
        result = await users_collection.insert_one(new_user.model_dump())

        # 8. Lấy user vừa tạo
        created_user = await users_collection.find_one({"_id": result.inserted_id})
        created_user["_id"] = str(created_user["_id"])
        data_directory = paths.USERS_DATA_DIR / created_user["_id"]

        # 9. Cập nhật data_directory vào user
        await users_collection.update_one(
            {"_id": ObjectId(created_user["_id"])},
            {"$set": {"data_directory": str(data_directory)}},
        )

        # 10. Tạo thư mục user data
        os.makedirs(data_directory, exist_ok=True)
        LOGGER.info(f"Created user directory: {data_directory}")

        # 11. Gắn thêm field vào object trả về
        created_user["data_directory"] = str(data_directory)

        return created_user
        
    except Exception as e:
        LOGGER.error(f"Error creating user: {e}")
        raise


async def fetch_all_users(db: AsyncIOMotorDatabase) -> list[dict]:
    """Legacy function - Lấy tất cả users (không pagination)"""
    users_collection = db["users"]
    cursor = users_collection.find({})
    users = await cursor.to_list(length=None)

    # Normalize toàn bộ document
    return [normalize_mongo_doc(u) for u in users]


async def fetch_users_with_pagination(
    db: AsyncIOMotorDatabase,
    pagination: PaginationParams,
    filters: UserFilterParams
) -> tuple[list[dict], int]:
    """
    Lấy danh sách users với pagination và filters
    
    Args:
        db: Database instance
        pagination: Pagination parameters
        filters: Filter parameters
    
    Returns:
        tuple: (list of users, total count)
    """
    users_collection = db[USER_COLLECTION]
    
    # Build query từ filters
    query = filters.build_query()
    
    # Get total count
    total = await users_collection.count_documents(query)
    
    # Get users với pagination và sorting
    cursor = users_collection.find(query).sort(
        pagination.sort, 
        pagination.sort_direction
    ).skip(pagination.skip).limit(pagination.limit)
    
    users = await cursor.to_list(length=None)
    
    # Normalize documents
    normalized_users = [normalize_mongo_doc(u) for u in users]
    
    return normalized_users, total


async def delete_user(db: AsyncIOMotorDatabase, user_id: str) -> bool:
    """
    Xóa user theo ID
    
    Args:
        db: Database instance
        user_id: ID của user cần xóa
    
    Returns:
        bool: True nếu xóa thành công, False nếu không tìm thấy user
    
    Raises:
        Exception: Nếu có lỗi khi xóa user
    """
    try:
        users_collection = db[USER_COLLECTION]

        # Convert string ID -> ObjectId nếu có thể
        try:
            object_id = ObjectId(user_id)
        except Exception:
            object_id = user_id

        # 1. Kiểm tra user tồn tại
        existing_user = await users_collection.find_one({"_id": object_id})
        if not existing_user:
            LOGGER.warning(f"User not found: {user_id}")
            return False

        # 2. Xóa user khỏi MongoDB
        result = await users_collection.delete_one({"_id": object_id})

        # 3. Nếu xóa DB thành công → đổi tên thư mục data/<user_id> → data/<user_id>_deleted
        if result.deleted_count > 0:
            user_dir = paths.USERS_DATA_DIR / str(user_id)
            deleted_dir = paths.USERS_DATA_DIR / f"{user_id}_deleted"

            if user_dir.exists():
                try:
                    # Nếu thư mục _deleted đã tồn tại (xoá lần 2) → thêm timestamp tránh trùng
                    if deleted_dir.exists():
                        from datetime import datetime
                        suffix = datetime.now().strftime("%Y%m%d_%H%M%S")
                        deleted_dir = paths.USERS_DATA_DIR / f"{user_id}_deleted_{suffix}"

                    os.rename(user_dir, deleted_dir)
                    LOGGER.info(f"Renamed user dir to: {deleted_dir}")
                except Exception as e:
                    LOGGER.error(f"Failed to rename user dir {user_dir} → {deleted_dir}: {e}")
            else:
                LOGGER.warning(f"No data folder found for user {user_id}")

            LOGGER.info(f"Successfully deleted user: {user_id}")
            return True

        else:
            LOGGER.warning(f"Failed to delete user: {user_id}")
            return False

    except Exception as e:
        LOGGER.error(f"Error deleting user {user_id}: {e}")
        raise


async def update_user(
    db: AsyncIOMotorDatabase, 
    user_id: str,  # <-- Thêm user_id làm tham số
    payload: UserUpdate  # <-- Đổi tên user_data thành payload cho rõ nghĩa
) -> Optional[UserUpdateResponse]:
    """
    Cập nhật thông tin user

    Args:
        db: Database instance
        user_id: ID của user cần cập nhật (từ URL)
        payload: Dữ liệu cập nhật user (từ body)

    Returns:
        UserUpdateResponse | None: User sau khi cập nhật, hoặc None nếu không tìm thấy
    """
    try:
        users_collection = db[USER_COLLECTION]
        
        # SỬ DỤNG user_id TRỰC TIẾP
        object_id = ObjectId(user_id) 

        existing_user = await users_collection.find_one({"_id": object_id})
        if not existing_user:
            # SỬ DỤNG user_id
            LOGGER.warning(f"User not found for update: {user_id}")
            return None

        # Chuẩn bị dữ liệu cập nhật
        update_fields = payload.model_dump(exclude_unset=True)

        # Nếu không có trường nào được gửi lên để cập nhật
        if not update_fields:
            LOGGER.info(f"No update fields provided for user: {user_id}")
            return None
            # Bạn có thể return ngay ở đây nếu muốn
            # Hoặc cứ chạy tiếp để cập nhật `updated_at`
        
        # Kiểm tra telegram_username unique (nếu có trong update_fields)
        if "telegram_username" in update_fields:
            telegram_username = update_fields.get("telegram_username")
            
            # Nếu telegram_username không phải None và không rỗng
            if telegram_username and telegram_username.strip():
                # Loại bỏ @ nếu có ở đầu
                username = telegram_username.strip().lstrip('@')
                
                # Kiểm tra xem có user nào khác đã sử dụng telegram_username này chưa
                # (trừ user hiện tại đang được update)
                existing_user_with_telegram = await users_collection.find_one({
                    "telegram_username": username,
                    "_id": {"$ne": object_id}  # Loại trừ user hiện tại
                })
                
                if existing_user_with_telegram:
                    LOGGER.warning(
                        f"Telegram username {username} already exists for user "
                        f"{existing_user_with_telegram.get('_id')}"
                    )
                    raise HTTPException(
                        status_code=400,
                        detail=f"Telegram username {username} already exists"
                    )
                
                # Cập nhật lại update_fields với username đã được normalize
                update_fields["telegram_username"] = username
            else:
                # Nếu telegram_username là None hoặc rỗng, cho phép xóa nó
                update_fields["telegram_username"] = None
        
        update_fields["updated_at"] = utc_now()

        # Thực hiện update
        await users_collection.update_one(
            {"_id": object_id},
            {"$set": update_fields}
        )

        # Lấy lại document sau khi cập nhật
        updated_user = await users_collection.find_one({"_id": object_id})
        if not updated_user:
            return None

        # (Phần map dữ liệu trả về giữ nguyên)
        return UserUpdateResponse(
            id=str(updated_user["_id"]),
            username=updated_user["username"],
            email=updated_user["email"],
            full_name=updated_user["full_name"],
            role=updated_user["role"],
            position=updated_user["position"],
            department=updated_user["department"],
            telegram_username=updated_user.get("telegram_username"),
            is_active=updated_user["is_active"],
        )

    except Exception as e:
        # SỬ DỤNG user_id
        LOGGER.error(f"Error updating user {user_id}: {e}")
        raise


async def upload_user_faces(
    db: AsyncIOMotorDatabase,
    user_id: str,
    files: List[UploadFile],
):
    """
    Upload nhiều ảnh khuôn mặt cho user.
    - Tự xử lý HEIC -> JPEG
    - Kiểm tra số khuôn mặt (chỉ chấp nhận 1)
    - Lưu embeddings theo dạng [{path, embedding}]
    - Partial success: chỉ lưu ảnh hợp lệ
    """

    # 1. Kiểm tra user
    user = await db[USER_COLLECTION].find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.get("data_directory"):
        raise HTTPException(status_code=500, detail="User has no data_directory")

    user_dir = Path(user["data_directory"])
    faces_dir = user_dir / "faces"
    faces_dir.mkdir(parents=True, exist_ok=True)

    saved_files: List[str] = []
    valid_images: List[np.ndarray] = []
    valid_detections: List[Tuple[np.ndarray, np.ndarray]] = []
    invalid_files: List[Dict[str, str]] = []

    # 2. Lưu từng ảnh và kiểm tra hợp lệ
    for file in files:
        ext = Path(file.filename).suffix.lower()
        timestamp = int(time.time() * 1000)
        out_name = f"face_{timestamp}.jpg"
        out_path = faces_dir / out_name

        # --- Save or convert file ---
        try:
            if ext in [".heic", ".heif"]:
                if pillow_heif is None:
                    raise HTTPException(status_code=500, detail="pillow-heif not installed")

                heif_img = pillow_heif.open_heif(file.file)
                image = Image.frombytes(heif_img.mode, heif_img.size, heif_img.data, "raw")
                image.save(out_path, "JPEG")
            else:
                with open(out_path, "wb") as buffer:
                    shutil.copyfileobj(file.file, buffer)
        except Exception as e:
            invalid_files.append({"file": file.filename, "reason": f"Failed to save: {e}"})
            if out_path.exists():
                os.remove(out_path)
            continue

        # --- Detect face ---
        try:
            image, detection_results, _, num_faces = await asyncio.to_thread(detect_faces, str(out_path))
        except Exception as e:
            invalid_files.append({"file": file.filename, "reason": f"Error analyzing face: {e}"})
            os.remove(out_path)
            continue

        if num_faces == 0:
            invalid_files.append({"file": file.filename, "reason": "No face detected"})
            os.remove(out_path)
            continue
        elif num_faces > 1:
            invalid_files.append({"file": file.filename, "reason": f"Multiple faces detected ({num_faces})"})
            os.remove(out_path)
            continue

        # --- Hợp lệ ---
        saved_files.append(out_name)
        valid_images.append(image)
        valid_detections.append(detection_results[0])  # chỉ tuple (bboxes, keypoints)

    # 3. Lấy embeddings (nếu có ảnh hợp lệ)
    face_embeds_data = []
    if valid_images:
        embeddings = await asyncio.to_thread(get_face_embeddings, valid_images, valid_detections)

        for name, emb in zip(saved_files, embeddings):
            face_embeds_data.append({
                "path": name,
                "embedding": emb.tolist()
            })

        LOGGER.info(f"Generated embeddings for {len(face_embeds_data)} faces, shape: {embeddings.shape}")

        # --- Cập nhật DB ---
        await db[USER_COLLECTION].update_one(
            {"_id": ObjectId(user_id)},
            {
                "$addToSet": {"face_image_filenames": {"$each": saved_files}},
                "$push": {"face_embeddings": {"$each": face_embeds_data}},
            },
        )

    #  Trả response
    return {
        "face_image_filenames": saved_files,
        "invalid_files": invalid_files,
        "meta": {
            "valid_count": len(saved_files),
            "invalid_count": len(invalid_files),
            "total_uploaded": len(files),
        },
    }


async def change_user_password(
    db: AsyncIOMotorDatabase,
    user_id: str,
    current_password: str,
    new_password: str,
) -> bool:
    """
    Đổi mật khẩu cho user hiện tại.
    - Kiểm tra mật khẩu cũ có khớp không
    - Hash mật khẩu mới
    - Cập nhật DB
    """
    users_collection = db[USER_COLLECTION]
    user = await users_collection.find_one({"_id": ObjectId(user_id)})

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Kiểm tra mật khẩu cũ
    if not verify_password(current_password, user["password"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    # Kiểm tra độ dài mật khẩu mới
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters long")

    # Hash mật khẩu mới
    hashed = hash_password(new_password)

    # Cập nhật DB
    await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"password": hashed}}
    )

    return True
