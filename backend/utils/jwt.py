# backend/utils/jwt.py

from datetime import timedelta
from typing import Optional
from jose import JWTError, jwt
from config.base import BaseConfig
from utils import LOGGER
from utils.time_helper import utc_now
from fastapi import HTTPException, status
from jose import ExpiredSignatureError

class JWTConfig(BaseConfig):
    """
    JWT Configuration
    """
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30
    JWT_ACCESS_TOKEN_EXPIRE_SECONDS: int = JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60


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
            expire = utc_now() + expires_delta
        else:
            expire = utc_now() + timedelta(minutes=jwt_config.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
        
        # Payload chỉ chứa user_id và expiration
        to_encode = {
            "sub": user_id,  # Subject (user_id)
            "type": "access",
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

def create_refresh_token(user_id: str, expires_delta: Optional[timedelta] = None) -> str:
    """
    Tạo JWT refresh token
    
    Args:
        user_id: User ID
        expires_delta: Thời gian hết hạn (optional)
    """
    try:
        if expires_delta:
            expire = utc_now() + expires_delta
        else:
            expire = utc_now() + timedelta(minutes=jwt_config.JWT_REFRESH_TOKEN_EXPIRE_MINUTES)
        
        to_encode = {
            "sub": user_id,  # Subject (user_id)
            "type": "refresh",
            "exp": expire    # Expiration time
        }
        
        encoded_jwt = jwt.encode(
            to_encode,
            jwt_config.JWT_SECRET_KEY,
            algorithm=jwt_config.JWT_ALGORITHM
        )
        
        LOGGER.debug(f"Created refresh token for user: {user_id}")
        return encoded_jwt
    except Exception as e:
        LOGGER.error(f"Error creating refresh token: {e}")
        raise


def verify_token(token: str) -> Optional[dict]:
    """
    Verify và decode JWT token
    
    Args:
        token: JWT token
    
    Returns:
        Optional[dict]: Payload nếu hợp lệ, None nếu invalid
    """
    try:
        payload = jwt.decode(
            token,
            jwt_config.JWT_SECRET_KEY,
            algorithms=[jwt_config.JWT_ALGORITHM]
        )

        # Có thể check thêm trường cần thiết
        if "sub" not in payload:
            LOGGER.warning("Token không có 'sub'")
            return None

        return payload  # ✅ trả nguyên payload dict

    except JWTError as e:
        LOGGER.warning(f"Invalid token: {e}")
        return None
    except Exception as e:
        LOGGER.error(f"Error verifying token: {e}")
        return None


def decode_token(token: str) -> dict:
    """
    Decode & verify JWT token

    Args:
        token (str): JWT token

    Returns:
        dict: Payload nếu hợp lệ

    Raises:
        HTTPException: Nếu token không hợp lệ hoặc hết hạn
    """
    try:
        payload = jwt.decode(
            token,
            jwt_config.JWT_SECRET_KEY,
            algorithms=[jwt_config.JWT_ALGORITHM],
            options={"verify_signature": True},  # ✅ phải verify chữ ký
        )
        return payload

    except ExpiredSignatureError:
        LOGGER.error("Token has expired.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )

    except JWTError as e:
        LOGGER.error(f"Invalid token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    except Exception as e:
        LOGGER.error(f"Unexpected error decoding token: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error while decoding token",
        )