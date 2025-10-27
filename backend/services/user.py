# backend/services/user.py

import os
from motor.motor_asyncio import AsyncIOMotorDatabase
from backend.schemas.user import UserCreate
from backend.models.user import UserModel
from backend.utils.password import hash_password
from backend.utils.pagination import PaginationParams
from backend.utils.filters import UserFilterParams
from utils import LOGGER
import re
from unidecode import unidecode
from utils.common import normalize_mongo_doc
from config import paths
from bson import ObjectId


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
        
        # 4. Hash password mặc định
        hashed_password = hash_password(DEFAULT_PASSWORD)
        
        # 5. Tạo user document
        new_user = UserModel(
            username=username,
            email=email,
            password=hashed_password,
            full_name=user_data.full_name,
            role=user_data.role,
            position=user_data.position,
            department=user_data.department,
            telegram_username=user_data.telegram_username,
        )
        
        # 6. Insert vào database
        result = await users_collection.insert_one(new_user.model_dump())
                
        # 7. Lấy user vừa tạo
        created_user = await users_collection.find_one({"_id": result.inserted_id})
        created_user["_id"] = str(created_user["_id"])

        # 8. Tạo thư mục user data
        user_dir = paths.USERS_DATA_DIR / created_user["_id"]
        os.makedirs(user_dir, exist_ok=True)
        LOGGER.info(f"Created user directory: {user_dir}")

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
    
    LOGGER.debug(f"Query: {query}")
    LOGGER.debug(f"Pagination: page={pagination.page}, limit={pagination.limit}, sort={pagination.sort}, order={pagination.order}")
    
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

        # 3️⃣ Nếu xóa DB thành công → đổi tên thư mục data/<user_id> → data/<user_id>_deleted
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