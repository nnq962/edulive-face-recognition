from datetime import datetime, timezone
from zoneinfo import ZoneInfo

VIETNAM_TZ = ZoneInfo("Asia/Ho_Chi_Minh")

# ===== FORMAT PRESETS =====
FMT_DATETIME = "%Y-%m-%d %H:%M:%S"
FMT_DATE = "%Y-%m-%d"
FMT_TIME = "%H:%M:%S"
FMT_ISO = "%Y-%m-%dT%H:%M:%SZ"  # ISO 8601 UTC format

def utc_now() -> datetime:
    """
    Lấy thời gian hiện tại theo UTC.
    """
    now_utc = datetime.now(timezone.utc)
    return now_utc

def utc_now_iso() -> str:
    """Trả về UTC time dạng ISO string '2025-10-31T10:43:22Z' để gửi API."""
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")