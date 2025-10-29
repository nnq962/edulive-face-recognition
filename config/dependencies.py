# config/dependencies.py

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from config.database import get_database
from backend.utils.jwt import verify_token
from utils import LOGGER
from utils.common import normalize_mongo_doc


# HTTPBearer để lấy token từ header Authorization: Bearer <token>
security = HTTPBearer()


async def get_db() -> AsyncIOMotorDatabase:
    """
    Dependency: Lấy database instance
    
    Returns:
        AsyncIOMotorDatabase: MongoDB database
    """
    return get_database()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> dict:
    """
    Dependency: Lấy user hiện tại từ JWT access token
    """
    token = credentials.credentials

    try:
        # Decode & verify JWT
        payload = verify_token(token)
        if not payload:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")

        users_collection = db["users"]
        user = await users_collection.find_one(
            {"_id": ObjectId(user_id)},
            {"face_embeddings": 0}
        )
        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        return normalize_mongo_doc(user)

    except HTTPException:
        raise
    except Exception as e:
        LOGGER.error(f"Error getting current user: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")


async def get_current_active_user(
    current_user: dict = Depends(get_current_user)
) -> dict:
    """
    Dependency: Lấy user hiện tại và kiểm tra user có active không
    
    Args:
        current_user: User từ get_current_user
    
    Returns:
        dict: User document
    
    Raises:
        HTTPException: 401 nếu user không active
    """
    if not current_user.get("is_active", False):
        LOGGER.warning(f"Inactive user tried to access: {current_user.get('username')}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized"
        )
    
    return current_user


async def require_admin(
    current_user: dict = Depends(get_current_active_user),
) -> dict:
    """
    Chỉ cho phép admin hoặc super_admin truy cập.
    """
    role = current_user.get("role")

    if role not in ("admin", "super_admin"):
        LOGGER.warning(
            f"User '{current_user.get('username')}' tried to access admin route with role '{role}'"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Requires admin privileges",
        )

    return current_user


async def require_super_admin(
    current_user: dict = Depends(get_current_active_user),
) -> dict:
    """
    Chỉ cho phép super_admin truy cập.
    """
    if current_user.get("role") != "super_admin":
        LOGGER.warning(
            f"User '{current_user.get('username')}' tried to access super-admin route with role '{current_user.get('role')}'"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Requires super_admin privileges",
        )

    return current_user