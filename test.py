# utils/password.py

from passlib.context import CryptContext
from utils import LOGGER


# Cấu hình password context với bcrypt
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def hash_password(password: str) -> str:
    """
    Hash password bằng bcrypt
    
    Args:
        password: Plain text password
    
    Returns:
        str: Hashed password
    
    Examples:
        >>> hash_password("123456")
        '$2b$12$...'
    """
    try:
        LOGGER.debug(f"Hashing password: {password}")
        LOGGER.debug(f"DEBUG password type: {type(password)}")
        LOGGER.debug(f"DEBUG password repr: {repr(password)}")
        hashed = pwd_context.hash(password)
        LOGGER.debug("Password hashed successfully")
        return hashed
    except Exception as e:
        LOGGER.error(f"Error hashing password: {e}")
        raise

print(hash_password("123456"))