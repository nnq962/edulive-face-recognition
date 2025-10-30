from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone, date
from typing import Optional, List, Dict, Any
from bson import ObjectId
import calendar

from backend.schemas.common import PaginationMeta
from backend.utils.pagination import PaginationParams, calculate_pagination_meta


ATTENDANCE_COLLECTION = "attendances"
USER_COLLECTION = "users"


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


async def get_monthly_attendance_report(
    db: AsyncIOMotorDatabase,
    month_str: str,
    page: int = 1,
    limit: int = 10,
    user_id: Optional[str] = None,
    filter_date: Optional[str] = None,
    employee_name: Optional[str] = None
) -> tuple[List[Dict[str, Any]], dict]:
    """
    Lấy báo cáo chấm công theo tháng cho toàn bộ users với filtering
    
    Args:
        db: Database instance
        month_str: Tháng cần lấy (format: "YYYY-MM", ví dụ: "2025-10")
        page: Trang hiện tại (default: 1)
        limit: Số items mỗi trang (default: 10)
        user_id: Filter theo user_id cụ thể (optional)
        filter_date: Filter theo ngày cụ thể (format: "YYYY-MM-DD", optional)
        employee_name: Filter theo tên nhân viên (partial match, optional)
    
    Returns:
        tuple: (list of user monthly attendances, pagination metadata)
        
    Logic:
        - Mỗi user sẽ có đầy đủ các ngày trong tháng (30/31 ngày)
        - Ngày nào không có dữ liệu thì check_in_time và check_out_time = None
        - Filter được áp dụng trước khi pagination
        - Pagination áp dụng trên flatten list: 30 ngày của user A -> 30 ngày của user B -> ...
    """
    
    # Parse month string to year and month
    try:
        year, month = map(int, month_str.split("-"))
    except ValueError:
        raise ValueError("Invalid month format. Expected format: YYYY-MM (e.g., 2025-10)")
    
    # Tính số ngày trong tháng
    num_days = calendar.monthrange(year, month)[1]
    
    # Tạo start_date và end_date cho tháng
    start_date = datetime(year, month, 1, 0, 0, 0, tzinfo=timezone.utc)
    end_date = datetime(year, month, num_days, 23, 59, 59, 999999, tzinfo=timezone.utc)
    
    # Lấy tất cả users, sắp xếp theo full_name
    users_collection = db[USER_COLLECTION]
    
    # Build user query with filters
    user_query = {}
    
    # Filter by user_id nếu có
    if user_id:
        try:
            user_query["_id"] = ObjectId(user_id)
        except:
            raise ValueError(f"Invalid user_id format: {user_id}")
    
    # Filter by employee_name nếu có (partial match, case-insensitive)
    if employee_name:
        user_query["full_name"] = {"$regex": employee_name, "$options": "i"}
    
    users = await users_collection.find(user_query).sort("full_name", 1).to_list(length=None)
    
    if not users:
        return [], calculate_pagination_meta(page, limit, 0)
    
    # Lấy tất cả attendance records trong tháng
    attendances_collection = db[ATTENDANCE_COLLECTION]
    query = {
        "date": {
            "$gte": start_date,
            "$lte": end_date
        }
    }
    
    attendance_records = await attendances_collection.find(query).to_list(length=None)
    
    # Tạo lookup dictionary: {user_id: {date_str: attendance_data}}
    attendance_by_user = {}
    for record in attendance_records:
        user_id_str = str(record["user_id"])
        record_date = record["date"]
        
        # Convert datetime to date string (YYYY-MM-DD)
        date_str = record_date.strftime("%Y-%m-%d")
        
        if user_id_str not in attendance_by_user:
            attendance_by_user[user_id_str] = {}
        
        attendance_by_user[user_id_str][date_str] = {
            "check_in_time": record.get("check_in_time"),
            "check_out_time": record.get("check_out_time")
        }
    
    # Tạo danh sách tất cả các ngày trong tháng
    all_dates = [date(year, month, day) for day in range(1, num_days + 1)]
    
    # Nếu có filter_date, chỉ lấy ngày đó
    if filter_date:
        try:
            filter_date_obj = datetime.strptime(filter_date, "%Y-%m-%d").date()
            # Kiểm tra xem ngày có thuộc tháng hiện tại không
            if filter_date_obj.year == year and filter_date_obj.month == month:
                all_dates = [filter_date_obj]
            else:
                # Ngày không thuộc tháng hiện tại -> trả về rỗng
                return [], calculate_pagination_meta(page, limit, 0)
        except ValueError:
            raise ValueError(f"Invalid date format: {filter_date}. Expected format: YYYY-MM-DD")
    
    # Tạo flatten list: [user1_day1, user1_day2, ..., user2_day1, user2_day2, ...]
    flattened_data = []
    
    for user in users:
        user_id_str = str(user["_id"])
        user_full_name = user.get("full_name", "Unknown")
        
        user_attendances_dict = attendance_by_user.get(user_id_str, {})
        
        # Tạo attendance data cho mỗi ngày
        for day_date in all_dates:
            date_str = day_date.strftime("%Y-%m-%d")
            
            attendance_data = user_attendances_dict.get(date_str, {})
            
            flattened_data.append({
                "user_id": user_id_str,
                "full_name": user_full_name,
                "date": day_date,
                "check_in_time": attendance_data.get("check_in_time"),
                "check_out_time": attendance_data.get("check_out_time")
            })
    
    # Calculate total records
    total = len(flattened_data)
    
    # Apply pagination
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_data = flattened_data[start_idx:end_idx]
    
    # Group lại theo user cho response
    user_groups = {}
    for item in paginated_data:
        user_id = item["user_id"]
        
        if user_id not in user_groups:
            user_groups[user_id] = {
                "user_id": user_id,
                "full_name": item["full_name"],
                "attendances": []
            }
        
        user_groups[user_id]["attendances"].append({
            "date": item["date"],
            "check_in_time": item["check_in_time"],
            "check_out_time": item["check_out_time"]
        })
    
    # Convert to list
    result = list(user_groups.values())
    
    # Calculate pagination metadata
    pagination_meta = calculate_pagination_meta(page, limit, total)
    
    return result, pagination_meta
