# backend/utils/jwt.py

from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from config.base import BaseConfig
from utils import LOGGER


class JWTConfig(BaseConfig):
    """
    JWT Configuration
    """
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30


# Load config
jwt_config = JWTConfig()


def create_access_token(user_id: str, expires_delta: Optional[timedelta] = None) -> str:
    """
    Tạo JWT access token
    
    Args:
        user_id: User ID
        expires_delta: Thời gian hết hạn (optional)
    
    Returns:
        str: JWT token
    """
    try:
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=jwt_config.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
        
        # Payload chỉ chứa user_id và expiration
        to_encode = {
            "sub": user_id,  # Subject (user_id)
            "exp": expire    # Expiration time
        }
        
        encoded_jwt = jwt.encode(
            to_encode,
            jwt_config.JWT_SECRET_KEY,
            algorithm=jwt_config.JWT_ALGORITHM
        )
        
        LOGGER.debug(f"Created access token for user: {user_id}")
        return encoded_jwt
        
    except Exception as e:
        LOGGER.error(f"Error creating access token: {e}")
        raise


def verify_token(token: str) -> Optional[str]:
    """
    Verify và decode JWT token
    
    Args:
        token: JWT token
    
    Returns:
        Optional[str]: User ID nếu valid, None nếu invalid
    """
    try:
        payload = jwt.decode(
            token,
            jwt_config.JWT_SECRET_KEY,
            algorithms=[jwt_config.JWT_ALGORITHM]
        )
        
        user_id: str = payload.get("sub")
        
        if user_id is None:
            LOGGER.warning("Token không có user_id")
            return None
        
        return user_id
        
    except JWTError as e:
        LOGGER.warning(f"Invalid token: {e}")
        return None
    except Exception as e:
        LOGGER.error(f"Error verifying token: {e}")
        return None


def decode_token(token: str) -> Optional[dict]:
    """
    Decode token và trả về payload (không verify)
    
    Args:
        token: JWT token
    
    Returns:
        Optional[dict]: Payload nếu decode được, None nếu lỗi
    """
    try:
        payload = jwt.decode(
            token,
            jwt_config.JWT_SECRET_KEY,
            algorithms=[jwt_config.JWT_ALGORITHM],
            options={"verify_signature": False}
        )
        return payload
    except Exception as e:
        LOGGER.error(f"Error decoding token: {e}")
        return None