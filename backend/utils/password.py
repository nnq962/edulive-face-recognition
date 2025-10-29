# utils/password.py

from passlib.context import CryptContext
from utils import LOGGER


# Cấu hình password context với bcrypt
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def hash_password(password: str) -> str:
    """
    Hash password bằng Argon2
    
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


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Kiểm tra password có đúng không
    
    Args:
        plain_password: Password người dùng nhập
        hashed_password: Password đã hash trong database
    
    Returns:
        bool: True nếu password đúng, False nếu sai
    
    Examples:
        >>> hashed = hash_password("123456")
        >>> verify_password("123456", hashed)
        True
        >>> verify_password("wrong", hashed)
        False
    """
    try:
        result = pwd_context.verify(plain_password, hashed_password)
        if result:
            LOGGER.debug("Password verification successful")
        else:
            LOGGER.debug("Password verification failed")
        return result
    except Exception as e:
        LOGGER.error(f"Error verifying password: {e}")
        return False


def is_password_strong(password: str) -> tuple[bool, str]:
    """
    Kiểm tra password có đủ mạnh không
    
    Yêu cầu:
    - Tối thiểu 6 ký tự
    - Có chữ hoa
    - Có chữ thường
    - Có số
    
    Args:
        password: Password cần kiểm tra
    
    Returns:
        tuple[bool, str]: (True/False, thông báo lỗi)
    
    Examples:
        >>> is_password_strong("123456")
        (False, "Password phải có ít nhất 1 chữ hoa")
        >>> is_password_strong("Abc123")
        (True, "")
    """
    if len(password) < 6:
        return False, "Password phải có ít nhất 6 ký tự"
    
    if not any(c.isupper() for c in password):
        return False, "Password phải có ít nhất 1 chữ hoa"
    
    if not any(c.islower() for c in password):
        return False, "Password phải có ít nhất 1 chữ thường"
    
    if not any(c.isdigit() for c in password):
        return False, "Password phải có ít nhất 1 chữ số"
    
    return True, ""


def generate_random_password(length: int = 12) -> str:
    """
    Tạo random password mạnh
    
    Args:
        length: Độ dài password (mặc định 12)
    
    Returns:
        str: Random password
    
    Examples:
        >>> generate_random_password()
        'Xy9kL2mN8pQ1'
    """
    import secrets
    import string
    
    # Đảm bảo có đủ: chữ hoa, chữ thường, số
    alphabet = string.ascii_letters + string.digits
    
    while True:
        password = ''.join(secrets.choice(alphabet) for _ in range(length))
        
        # Check password đủ mạnh chưa
        if (any(c.islower() for c in password) and
            any(c.isupper() for c in password) and
            any(c.isdigit() for c in password)):
            LOGGER.debug(f"Generated random password with length {length}")
            return password