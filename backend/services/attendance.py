from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from bson import ObjectId

from backend.schemas.common import PaginationMeta
from backend.utils.pagination import PaginationParams


ATTENDANCE_COLLECTION = "attendances"


async def get_user_attendances(
    db: AsyncIOMotorDatabase,
    user_id: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    pagination: PaginationParams = None
) -> tuple[List[Dict[str, Any]], PaginationMeta]:
    """
    Lấy danh sách chấm công của user
    
    Args:
        user_id: ID của user
        start_date: Ngày bắt đầu filter (optional)
        end_date: Ngày kết thúc filter (optional)
        pagination: Pagination params
    
    Returns:
        tuple: (list of attendances, pagination metadata)
    """

    collection = db[ATTENDANCE_COLLECTION]
    
    # Build filter query - user_id là ObjectId
    query = {"user_id": ObjectId(user_id)}
    
    # Add date range filter nếu có
    if start_date or end_date:
        date_filter = {}
        
        if start_date:
            # Đảm bảo start_date có timezone
            if start_date.tzinfo is None:
                start_date = start_date.replace(tzinfo=timezone.utc)
            # Set to start of day (00:00:00)
            start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
            date_filter["$gte"] = start_date
        
        if end_date:
            # Đảm bảo end_date có timezone
            if end_date.tzinfo is None:
                end_date = end_date.replace(tzinfo=timezone.utc)
            # Set to end of day (23:59:59.999999)
            end_date = end_date.replace(hour=23, minute=59, second=59, microsecond=999999)
            date_filter["$lte"] = end_date
        
        query["date"] = date_filter
    
    # Count total documents
    total = await collection.count_documents(query)
    
    # Get paginated data
    cursor = collection.find(query) \
        .sort(pagination.sort, pagination.sort_direction) \
        .skip(pagination.skip) \
        .limit(pagination.limit)
    
    attendances = await cursor.to_list(length=pagination.limit)
    
    # Convert ObjectId to string và tính last_timestamp
    for attendance in attendances:
        # Chuyển _id thành id (alias)
        attendance["id"] = str(attendance["_id"])
        del attendance["_id"]  # Xóa _id
        
        # Tính last_timestamp từ timestamps array
        timestamps = attendance.get("timestamps", [])
        if timestamps and len(timestamps) > 0:
            # Lấy timestamp cuối cùng trong array
            last_ts = timestamps[-1]
            attendance["last_timestamp"] = last_ts
        else:
            # Nếu không có timestamps, dùng check_in_time làm fallback
            attendance["last_timestamp"] = {
                "time": attendance.get("check_in_time"),
                "camera_id": "UNKNOWN"
            }
    
    # Calculate pagination metadata
    pagination_meta = PaginationMeta(
        current_page=pagination.page,
        per_page=pagination.limit,
        total=total,
        total_pages=(total + pagination.limit - 1) // pagination.limit if pagination.limit > 0 else 0,
        from_=(pagination.page - 1) * pagination.limit + 1 if total > 0 else 0,
        to=min(pagination.page * pagination.limit, total),
        has_next=pagination.page * pagination.limit < total,
        has_prev=pagination.page > 1,
    )
    
    return attendances, pagination_meta
