from datetime import datetime, timezone
from zoneinfo import ZoneInfo

VIETNAM_TZ = ZoneInfo("Asia/Ho_Chi_Minh")

# ===== FORMAT PRESETS =====
FMT_DATETIME = "%Y-%m-%d %H:%M:%S"
FMT_DATE = "%Y-%m-%d"
FMT_TIME = "%H:%M:%S"
FMT_ISO = "%Y-%m-%dT%H:%M:%SZ"  # ISO 8601 UTC format


def utc_now(fmt: str = FMT_DATETIME) -> str:
    """
    Lấy thời gian hiện tại theo UTC.
    fmt: format theo strftime (default = YYYY-MM-DD HH:MM:SS)
    """
    now_utc = datetime.now(timezone.utc)
    return now_utc.strftime(fmt)


def vietnam_now(fmt: str = FMT_DATETIME) -> str:
    """
    Lấy thời gian hiện tại theo giờ Việt Nam (Asia/Ho_Chi_Minh).
    fmt: format theo strftime (default = YYYY-MM-DD HH:MM:SS)
    """
    now_vn = datetime.now(VIETNAM_TZ)
    return now_vn.strftime(fmt)


def to_vietnam_time(dt: datetime, fmt: str = FMT_DATETIME) -> str:
    """
    Chuyển datetime bất kỳ về giờ Việt Nam.
    """
    if dt.tzinfo is None:
        # assume input là naive datetime (UTC)
        dt = dt.replace(tzinfo=timezone.utc)
    vn_dt = dt.astimezone(VIETNAM_TZ)
    return vn_dt.strftime(fmt)


def to_utc(dt: datetime, fmt: str = FMT_DATETIME) -> str:
    """
    Chuyển datetime bất kỳ về UTC.
    """
    if dt.tzinfo is None:
        # assume input là naive datetime (Việt Nam)
        dt = dt.replace(tzinfo=VIETNAM_TZ)
    utc_dt = dt.astimezone(timezone.utc)
    return utc_dt.strftime(fmt)


def parse_iso(iso_str: str) -> datetime:
    """
    Parse chuỗi ISO 8601 thành datetime có tzinfo (UTC).
    """
    return datetime.fromisoformat(iso_str.replace("Z", "+00:00"))