# utils/verify_api_key.py
from fastapi import Header, HTTPException, Depends
from utils import LOGGER
from config import keys


def get_api_key_header(x_api_key: str = Header(None)) -> str:
    """
    Extract API key from X-API-Key header (shared helper)
    """
    if not x_api_key:
        raise HTTPException(
            status_code=401,
            detail="Missing API key. Please provide X-API-Key header."
        )
    return x_api_key


def verify_update_attendance_key(api_key: str = Depends(get_api_key_header)) -> bool:
    """
    Verify API key for attendance update endpoint
    Dùng cho: /api/attendances/detect
    """
    if api_key != keys.UPDATE_ATTENDANCE_API_KEY:
        LOGGER.warning(f"Invalid UPDATE_ATTENDANCE_API_KEY attempt")
        raise HTTPException(
            status_code=401,
            detail="Invalid API key"
        )
    return True


def verify_update_faiss_key(api_key: str = Depends(get_api_key_header)) -> bool:
    """
    Verify API key for update FAISS endpoint
    Dùng cho: /api/update-faiss (AI Service)
    """
    if api_key != keys.UPDATE_FAISS_API_KEY:
        LOGGER.warning(f"Invalid UPDATE_FAISS_API_KEY attempt")
        raise HTTPException(
            status_code=401,
            detail="Invalid API key"
        )
    return True


def verify_supervisor_status_key(api_key: str = Depends(get_api_key_header)) -> bool:
    """
    Verify API key for supervisor status endpoint
    Dùng cho: /api/supervisor/status
    """
    if api_key != keys.SUPERVISOR_STATUS_API_KEY:
        LOGGER.warning(f"Invalid SUPERVISOR_STATUS_API_KEY attempt")
        raise HTTPException(
            status_code=401,
            detail="Invalid API key"
        )
    return True