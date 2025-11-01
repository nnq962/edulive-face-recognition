from datetime import datetime
from zoneinfo import ZoneInfo

# ===== MÚI GIỜ & ĐỊNH DẠNG =====
VIETNAM_TZ = ZoneInfo("Asia/Ho_Chi_Minh")

FMT_DATETIME = "%Y-%m-%d %H:%M:%S"
FMT_DATE = "%Y-%m-%d"
FMT_TIME = "%H:%M:%S"
FMT_ISO = "%Y-%m-%dT%H:%M:%S%z"  # ISO 8601 local format (ví dụ: 2025-11-01T18:12:00+0700)


# ===== CÁC HÀM TIỆN ÍCH =====

def vn_now() -> datetime:
    """
    Lấy thời gian hiện tại theo múi giờ Việt Nam (Asia/Ho_Chi_Minh).
    Dùng để lưu DB (kiểu datetime timezone-aware).
    """
    return datetime.now(VIETNAM_TZ)


def vn_now_str(fmt: str = FMT_DATETIME) -> str:
    """
    Trả về thời gian hiện tại theo format tuỳ chọn.
    Dùng để log hoặc hiển thị.
    """
    return datetime.now(VIETNAM_TZ).strftime(fmt)


def vn_now_date() -> str:
    """
    Trả về chuỗi ngày hiện tại (YYYY-MM-DD).
    """
    return datetime.now(VIETNAM_TZ).strftime(FMT_DATE)


def vn_now_time() -> str:
    """
    Trả về chuỗi giờ hiện tại (HH:MM:SS).
    """
    return datetime.now(VIETNAM_TZ).strftime(FMT_TIME)


def vn_now_iso() -> str:
    """
    Trả về ISO string dạng '2025-11-01T18:12:00+07:00' (chuẩn ISO 8601 local time).
    Dùng để serialize JSON hoặc gửi API.
    """
    return datetime.now(VIETNAM_TZ).replace(microsecond=0).isoformat()