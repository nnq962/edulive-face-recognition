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