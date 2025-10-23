# config/dependencies.py

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from config.database import get_database
from backend.utils.jwt import verify_token
from utils import LOGGER


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
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> dict:
    """
    Dependency: Lấy user hiện tại từ JWT token
    
    Args:
        credentials: Token từ header Authorization
        db: Database instance
    
    Returns:
        dict: User document
    
    Raises:
        HTTPException: 401 nếu token invalid hoặc user không tồn tại
    """
    # Lấy token
    token = credentials.credentials
    
    # Verify token
    user_id = verify_token(token)
    
    if user_id is None:
        LOGGER.warning("Invalid or expired token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # Query user từ database
    try:
        users_collection = db["users"]
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
        
        if user is None:
            LOGGER.warning(f"User not found: {user_id}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unauthorized",
                headers={"WWW-Authenticate": "Bearer"}
            )
        
        # Convert ObjectId to string
        user["id"] = str(user["_id"])
        
        return user
        
    except Exception as e:
        LOGGER.error(f"Error getting current user: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
            headers={"WWW-Authenticate": "Bearer"}
        )


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
    current_user: dict = Depends(get_current_active_user)
) -> dict:
    """
    Dependency: Kiểm tra user có phải admin không
    
    Args:
        current_user: User từ get_current_active_user
    
    Returns:
        dict: User document
    
    Raises:
        HTTPException: 403 nếu user không phải admin
    """
    if not current_user.get("is_admin", False):
        LOGGER.warning(f"Non-admin user tried to access admin endpoint: {current_user.get('username')}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden"
        )
    
    return current_user