from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone, date, timedelta
from typing import Optional, List, Dict, Any
from bson import ObjectId
import calendar
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter
import tempfile
import os
import asyncio

from utils import LOGGER
from backend.schemas.common import PaginationMeta
from backend.utils.pagination import PaginationParams, calculate_pagination_meta
from backend.services.telegram import send_telegram_message_to_user

ATTENDANCE_COLLECTION = "attendances"
USER_COLLECTION = "users"

# Business constants
CHECKOUT_TIME_HOUR = 17
CHECKOUT_TIME_MINUTE = 30


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
    department: Optional[str] = None
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
        department: Filter theo tên phòng ban (string, optional)
    
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
    
    # Tạo start_date và end_date cho tháng dựa trên múi giờ Việt Nam (UTC+7)
    # Lưu ý: Trường `date` trong DB đang lưu ở 17:00:00Z (tương ứng 00:00:00+07)
    # nên cần tính ranh giới tháng theo giờ VN rồi chuyển sang UTC để truy vấn chính xác
    vn_tz = timezone(timedelta(hours=7))
    vn_month_start = datetime(year, month, 1, 0, 0, 0, tzinfo=vn_tz)
    vn_month_end = datetime(year, month, num_days, 23, 59, 59, 999999, tzinfo=vn_tz)
    start_date = vn_month_start.astimezone(timezone.utc)
    end_date = vn_month_end.astimezone(timezone.utc)
    
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
    
    # Filter by department (string) nếu có
    if department:
        user_query["department"] = department
    
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
        
        # Chuẩn hóa ngày theo giờ Việt Nam, sau đó format YYYY-MM-DD
        # Trường `date` lưu UTC, cần chuyển sang UTC+7 để lấy đúng ngày local
        record_date_vn = record_date.replace(tzinfo=timezone.utc).astimezone(vn_tz)
        date_str = record_date_vn.strftime("%Y-%m-%d")
        
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


async def get_monthly_attendance_report_for_export(
    db: AsyncIOMotorDatabase,
    month_str: str,
    user_id: Optional[str] = None,
    filter_date: Optional[str] = None,
    department: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Lấy báo cáo chấm công theo tháng cho export Excel (KHÔNG pagination)
    
    Args:
        db: Database instance
        month_str: Tháng cần lấy (format: "YYYY-MM", ví dụ: "2025-10")
        user_id: Filter theo user_id cụ thể (optional)
        filter_date: Filter theo ngày cụ thể (format: "YYYY-MM-DD", optional)
        department: Filter theo tên phòng ban (string, optional)
    
    Returns:
        list: Tất cả attendance records (không pagination)
    """
    
    # Parse month string to year and month
    try:
        year, month = map(int, month_str.split("-"))
    except ValueError:
        raise ValueError("Invalid month format. Expected format: YYYY-MM (e.g., 2025-10)")
    
    # Tính số ngày trong tháng
    num_days = calendar.monthrange(year, month)[1]
    
    # Tạo start_date và end_date cho tháng dựa trên múi giờ Việt Nam (UTC+7)
    vn_tz = timezone(timedelta(hours=7))
    vn_month_start = datetime(year, month, 1, 0, 0, 0, tzinfo=vn_tz)
    vn_month_end = datetime(year, month, num_days, 23, 59, 59, 999999, tzinfo=vn_tz)
    start_date = vn_month_start.astimezone(timezone.utc)
    end_date = vn_month_end.astimezone(timezone.utc)
    
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
    
    # Filter by department (string) nếu có
    if department:
        user_query["department"] = department
    
    users = await users_collection.find(user_query).sort("full_name", 1).to_list(length=None)
    
    if not users:
        return []
    
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
        
        # Chuẩn hóa ngày theo giờ Việt Nam, sau đó format YYYY-MM-DD
        record_date_vn = record_date.replace(tzinfo=timezone.utc).astimezone(vn_tz)
        date_str = record_date_vn.strftime("%Y-%m-%d")
        
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
                return []
        except ValueError:
            raise ValueError(f"Invalid date format: {filter_date}. Expected format: YYYY-MM-DD")
    
    # Tạo flatten list: [user1_day1, user1_day2, ..., user2_day1, user2_day2, ...]
    flattened_data = []
    
    for user in users:
        user_id_str = str(user["_id"])
        user_full_name = user.get("full_name", "Unknown")
        user_department = user.get("department", "")
        user_position = user.get("position", "")
        
        user_attendances_dict = attendance_by_user.get(user_id_str, {})
        
        # Tạo attendance data cho mỗi ngày
        for day_date in all_dates:
            date_str = day_date.strftime("%Y-%m-%d")
            
            attendance_data = user_attendances_dict.get(date_str, {})
            
            flattened_data.append({
                "user_id": user_id_str,
                "full_name": user_full_name,
                "department": user_department,
                "position": user_position,
                "date": day_date,
                "check_in_time": attendance_data.get("check_in_time"),
                "check_out_time": attendance_data.get("check_out_time")
            })
    
    return flattened_data


def generate_excel_report(data: List[Dict[str, Any]], month_str: str) -> str:
    """
    Generate Excel file từ attendance data
    
    Args:
        data: List of attendance records
        month_str: Tháng (format: YYYY-MM)
    
    Returns:
        str: Path to the generated Excel file
    """
    
    # Tạo workbook mới
    wb = Workbook()
    ws = wb.active
    ws.title = f"Báo cáo {month_str}"
    
    # Define styles
    header_font = Font(name='Arial', size=11, bold=True, color='FFFFFF')
    header_fill = PatternFill(start_color='4472C4', end_color='4472C4', fill_type='solid')
    header_alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
    
    cell_alignment = Alignment(horizontal='center', vertical='center')
    border = Border(
        left=Side(style='thin', color='000000'),
        right=Side(style='thin', color='000000'),
        top=Side(style='thin', color='000000'),
        bottom=Side(style='thin', color='000000')
    )
    
    # Headers
    headers = [
        'STT',
        'Tên nhân viên',
        'Phòng ban',
        'Chức vụ',
        'Ngày',
        'Thứ',
        'Giờ vào',
        'Giờ ra',
        'Tổng giờ',
    ]
    
    # Write headers
    for col_num, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col_num)
        cell.value = header
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_alignment
        cell.border = border
    
    # Adjust column widths
    column_widths = [6, 25, 15, 20, 12, 10, 10, 10, 12]
    for i, width in enumerate(column_widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = width
    
    # Write data
    weekday_names = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy']
    
    for row_num, record in enumerate(data, 2):
        # STT
        cell = ws.cell(row=row_num, column=1)
        cell.value = row_num - 1
        cell.alignment = cell_alignment
        cell.border = border
        
        # Tên nhân viên
        cell = ws.cell(row=row_num, column=2)
        cell.value = record['full_name']
        cell.alignment = Alignment(horizontal='left', vertical='center')
        cell.border = border
        
        # Phòng ban
        cell = ws.cell(row=row_num, column=3)
        cell.value = record.get('department', '')
        cell.alignment = cell_alignment
        cell.border = border
        
        # Chức vụ
        cell = ws.cell(row=row_num, column=4)
        cell.value = record.get('position', '')
        cell.alignment = Alignment(horizontal='left', vertical='center')
        cell.border = border
        
        # Ngày
        cell = ws.cell(row=row_num, column=5)
        date_obj = record['date']
        cell.value = date_obj.strftime('%Y-%m-%d')
        cell.alignment = cell_alignment
        cell.border = border
        
        # Thứ
        cell = ws.cell(row=row_num, column=6)
        cell.value = weekday_names[date_obj.weekday() if date_obj.weekday() < 6 else 6]
        cell.alignment = cell_alignment
        cell.border = border
        
        # Giờ vào
        cell = ws.cell(row=row_num, column=7)
        check_in = record.get('check_in_time')
        if check_in:
            if isinstance(check_in, datetime):
                # Chuyển từ UTC sang UTC+7 (Việt Nam)
                check_in_vn = check_in.replace(tzinfo=timezone.utc).astimezone(timezone(timedelta(hours=7)))
                cell.value = check_in_vn.strftime('%H:%M')
            else:
                cell.value = str(check_in)
        else:
            cell.value = '-'
        cell.alignment = cell_alignment
        cell.border = border
        
        # Giờ ra
        cell = ws.cell(row=row_num, column=8)
        check_out = record.get('check_out_time')
        if check_out:
            if isinstance(check_out, datetime):
                # Chuyển từ UTC sang UTC+7 (Việt Nam)
                check_out_vn = check_out.replace(tzinfo=timezone.utc).astimezone(timezone(timedelta(hours=7)))
                cell.value = check_out_vn.strftime('%H:%M')
            else:
                cell.value = str(check_out)
        else:
            cell.value = '-'
        cell.alignment = cell_alignment
        cell.border = border
        
        # Tổng giờ
        # Quy tắc: 
        # - Nếu check out trước 13h30: Tổng giờ = 12h - check in
        # - Nếu check out sau hoặc bằng 13h30: Tổng giờ = check out - check in - 1.5h (nghỉ trưa)
        cell = ws.cell(row=row_num, column=9)
        if check_in and check_out:
            if isinstance(check_in, datetime) and isinstance(check_out, datetime):
                # Đảm bảo cả check_in và check_out đều có timezone UTC
                # Nếu chưa có timezone, thêm UTC timezone vào
                if check_in.tzinfo is None:
                    check_in = check_in.replace(tzinfo=timezone.utc)
                elif check_in.tzinfo != timezone.utc:
                    check_in = check_in.astimezone(timezone.utc)
                
                if check_out.tzinfo is None:
                    check_out = check_out.replace(tzinfo=timezone.utc)
                elif check_out.tzinfo != timezone.utc:
                    check_out = check_out.astimezone(timezone.utc)
                
                # Chuyển sang giờ Việt Nam (UTC+7) để check thời gian
                vn_tz = timezone(timedelta(hours=7))
                check_out_vn = check_out.astimezone(vn_tz)
                
                # Kiểm tra check out có trước 13h30 không
                check_out_hour = check_out_vn.hour
                check_out_minute = check_out_vn.minute
                is_before_lunch = check_out_hour < 13 or (check_out_hour == 13 and check_out_minute < 30)
                
                if is_before_lunch:
                    # Nếu check out trước 13h30: Tổng giờ = 12h - check in
                    check_in_vn = check_in.astimezone(vn_tz)
                    noon = datetime(
                        check_in_vn.year, 
                        check_in_vn.month, 
                        check_in_vn.day, 
                        12, 0, 0, 
                        tzinfo=vn_tz
                    )
                    noon_utc = noon.astimezone(timezone.utc)
                    diff_minutes = (noon_utc - check_in).total_seconds() / 60
                else:
                    # Nếu check out sau hoặc bằng 13h30: Tổng giờ = check out - check in - 1.5h (90 phút)
                    diff_minutes = (check_out - check_in).total_seconds() / 60 - 90
                
                # Đảm bảo không âm
                if diff_minutes < 0:
                    diff_minutes = 0
                
                hours = int(diff_minutes // 60)
                minutes = int(diff_minutes % 60)
                cell.value = f"{hours}h {minutes}m"
            else:
                cell.value = '-'
        else:
            cell.value = '-'
        cell.alignment = cell_alignment
        cell.border = border
    
    # Freeze first row
    ws.freeze_panes = 'A2'
    
    # Save to temporary file
    temp_dir = tempfile.gettempdir()
    filename = f"attendance_report_{month_str}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    filepath = os.path.join(temp_dir, filename)
    
    wb.save(filepath)
    
    return filepath


async def process_attendance_detections(
    db: AsyncIOMotorDatabase,
    timestamp: datetime,
    detections: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Xử lý batch detections từ client và cập nhật database
    
    Business Logic:
    1. Check-in: Lần đầu tiên trong ngày xuất hiện (trước 17h30)
    2. Check-out: Sau 17h30, check_out_time luôn là timestamp cuối cùng
    3. Welcome: Chỉ hiển thị 1 lần khi check-in đầu tiên
    4. Goodbye: Sau 17h30 khi detect được
    5. Sau 17h30: Không cho check-in nữa, check_in_time = None, chỉ có check-out
    6. Bonus: check_in_time luôn là timestamp đầu tiên, 
              check_out_time chỉ update sau 17h30 (luôn là timestamp cuối cùng)
    
    Args:
        db: Database instance
        timestamp: Thời điểm phát hiện (UTC)
        detections: List[{user_id, camera_id, similarity}]
    
    Returns:
        List[AttendanceActionResult]: Kết quả xử lý cho từng user
    """
    
    # Đảm bảo timestamp có timezone UTC
    if timestamp.tzinfo is None:
        timestamp = timestamp.replace(tzinfo=timezone.utc)
    
    # Chuyển sang giờ Việt Nam (UTC+7) để check thời gian
    vn_timezone = timezone(timedelta(hours=7))
    timestamp_vn = timestamp.astimezone(vn_timezone)
    
    # Xác định xem có phải sau 17h30 không
    is_after_checkout_time = (
        timestamp_vn.hour > CHECKOUT_TIME_HOUR or 
        (timestamp_vn.hour == CHECKOUT_TIME_HOUR and timestamp_vn.minute >= CHECKOUT_TIME_MINUTE)
    )
    
    # Lấy ngày hiện tại (start of day UTC)
    today_start_vn = datetime(
        timestamp_vn.year, 
        timestamp_vn.month, 
        timestamp_vn.day, 
        0, 0, 0, 
        tzinfo=vn_timezone
    )

    today_start = today_start_vn.astimezone(timezone.utc)
    
    results = []
    
    # Collections
    attendances_collection = db[ATTENDANCE_COLLECTION]
    users_collection = db[USER_COLLECTION]
    
    # Group detections by user_id để xử lý từng user
    detections_by_user = {}
    for detection in detections:
        user_id = detection["user_id"]
        if user_id not in detections_by_user:
            detections_by_user[user_id] = []
        detections_by_user[user_id].append(detection)
    
    # Xử lý từng user
    for user_id, user_detections in detections_by_user.items():
        try:
            # Lấy thông tin user
            user = await users_collection.find_one({"_id": ObjectId(user_id)})
            if not user:
                # Skip nếu user không tồn tại
                continue
            
            full_name = user.get("full_name", "Unknown")
            
            # Tìm attendance record của user trong ngày hôm nay
            existing_record = await attendances_collection.find_one({
                "user_id": ObjectId(user_id),
                "date": today_start
            })
            
            # Tạo timestamps từ detections
            new_timestamps = []
            for detection in user_detections:
                new_timestamps.append({
                    "time": timestamp,
                    "camera_id": detection["camera_id"],
                    "similarity": detection["similarity"]
                })
            
            action = ""
            send_welcome = False
            send_goodbye = False
            message = None
            
            if existing_record:
                # ĐÃ CÓ RECORD TRONG NGÀY
                
                # Luôn append timestamps mới vào
                updated_timestamps = existing_record.get("timestamps", []) + new_timestamps
                
                if is_after_checkout_time:
                    # SAU 17H30 - Chỉ update check_out_time
                    action = "check_out"
                    
                    # Chỉ gửi goodbye nếu chưa gửi trước đó
                    if not existing_record.get("goodbye_noti", False):
                        send_goodbye = True
                        message = f"Tạm biệt {full_name}"
                    else:
                        send_goodbye = False
                        message = None
                    
                    # Update record - luôn update check_out_time và timestamps
                    update_data = {
                        "check_out_time": timestamp,  # Luôn là timestamp cuối cùng
                        "timestamps": updated_timestamps
                    }
                    
                    # Chỉ set goodbye_noti = True nếu chưa set trước đó
                    if not existing_record.get("goodbye_noti", False):
                        update_data["goodbye_noti"] = True
                    
                    await attendances_collection.update_one(
                        {"_id": existing_record["_id"]},
                        {"$set": update_data}
                    )
                else:
                    # TRƯỚC 17H30 - Chỉ thêm timestamp, không update check_in/check_out
                    action = "timestamp_added"
                    send_welcome = False
                    send_goodbye = False
                    
                    # Update record
                    await attendances_collection.update_one(
                        {"_id": existing_record["_id"]},
                        {
                            "$set": {
                                "timestamps": updated_timestamps
                            }
                        }
                    )
            
            else:
                # CHƯA CÓ RECORD TRONG NGÀY - Tạo mới
                
                if is_after_checkout_time:
                    # SAU 17H30 - Chỉ tạo check_out, không có check_in
                    action = "after_hours_only"
                    send_goodbye = True
                    message = f"Tạm biệt {full_name}"
                    
                    new_record = {
                        "date": today_start,
                        "user_id": ObjectId(user_id),
                        "full_name": full_name,
                        "check_in_time": None,  # Không có check-in
                        "check_out_time": timestamp,
                        "timestamps": new_timestamps,
                        "welcome_noti": False,
                        "goodbye_noti": True
                    }
                else:
                    # TRƯỚC 17H30 - Check-in đầu tiên
                    action = "check_in"
                    send_welcome = True
                    message = f"Xin chào {full_name}"
                    
                    new_record = {
                        "date": today_start,
                        "user_id": ObjectId(user_id),
                        "full_name": full_name,
                        "check_in_time": timestamp,
                        "check_out_time": None,  # Chưa có check-out
                        "timestamps": new_timestamps,
                        "welcome_noti": True,
                        "goodbye_noti": False
                    }
                
                # Insert record mới
                await attendances_collection.insert_one(new_record)
            
            # Gửi Telegram message nếu cần
            if (send_welcome or send_goodbye) and message:
                # Kiểm tra user có đăng ký Telegram và có chat_id không
                if user.get("telegram_subscribed", False) and user.get("telegram_chat_id"):
                    # Format message đẹp cho Telegram (khác với message trong results)
                    timestamp_vn_str = timestamp_vn.strftime("%H:%M:%S - %d/%m/%Y")

                    if send_welcome:
                        # Check-in message
                        telegram_message = (
                            f"👋 <b>Xin chào {full_name}!</b>\n\n"
                            f"✅ Đã check-in thành công\n"
                            f"🕐 Thời gian: {timestamp_vn_str}"
                        )
                    else:  # send_goodbye
                        # Check-out message
                        telegram_message = (
                            f"👋 <b>Tạm biệt {full_name}!</b>\n\n"
                            f"✅ Đã check-out thành công\n"
                            f"🕐 Thời gian: {timestamp_vn_str}"
                        )

                    async def _safe_send():
                        try:
                            await send_telegram_message_to_user(
                                db,
                                user_id,
                                telegram_message,
                                parse_mode="HTML"
                            )
                            LOGGER.info(f"Sent Telegram message to user {user_id} ({full_name})")
                        except Exception as e:
                            # Log lỗi nhưng không làm gián đoạn quá trình xử lý
                            LOGGER.error(f"Failed to send Telegram message to user {user_id}: {e}")

                    # Fire-and-forget để API phản hồi nhanh, không chặn theo từng user
                    asyncio.create_task(_safe_send())
            
            # Thêm kết quả
            results.append({
                "user_id": user_id,
                "full_name": full_name,
                "action": action,
                "send_welcome": send_welcome,
                "send_goodbye": send_goodbye,
                "message": message
            })
        
        except Exception as e:
            # Log error nhưng vẫn tiếp tục xử lý các user khác
            LOGGER.error(f"Error processing user {user_id}: {str(e)}")
            continue
    
    return results


async def finalize_today_checkouts(
    db: AsyncIOMotorDatabase,
    now_utc: Optional[datetime] = None
) -> int:
    """
    Tự động chốt check_out_time sau 17:30 (giờ Việt Nam) cho các bản ghi hôm nay
    chưa có check_out_time nhưng đã có timestamps.

    Quy ước ngày:
    - Trường `date` trong DB lưu tại 17:00:00Z, đại diện cho 00:00:00+07 cùng ngày VN
    - Ví dụ: 2025-11-02T17:00:00Z đại diện cho ngày 2025-11-03 (VN)

    Args:
        db: Database instance
        now_utc: Thời điểm hiện tại (UTC) để test; nếu None sẽ dùng now()

    Returns:
        int: Số bản ghi được cập nhật
    """

    # Lấy thời điểm hiện tại theo UTC rồi chuyển sang VN timezone
    vn_tz = timezone(timedelta(hours=7))
    if now_utc is None:
        now_utc = datetime.now(timezone.utc)
    now_vn = now_utc.astimezone(vn_tz)

    # Chỉ chạy sau 17:30 (giờ VN)
    if (now_vn.hour, now_vn.minute) < (CHECKOUT_TIME_HOUR, CHECKOUT_TIME_MINUTE):
        return 0

    # Tính start of day theo VN rồi chuyển về UTC để khớp với trường `date` (17:00Z)
    today_start_vn = datetime(now_vn.year, now_vn.month, now_vn.day, 0, 0, 0, tzinfo=vn_tz)
    today_start_utc = today_start_vn.astimezone(timezone.utc)

    attendances_collection = db[ATTENDANCE_COLLECTION]

    # Tìm các record của hôm nay (VN) chưa có check_out_time nhưng có timestamps
    cursor = attendances_collection.find({
        "date": today_start_utc,
        "check_out_time": None,
        "timestamps": {"$exists": True, "$type": "array", "$ne": []}
    })

    updates = 0
    async for record in cursor:
        timestamps = record.get("timestamps", [])
        if not timestamps:
            continue
        last_ts = timestamps[-1]
        last_time = last_ts.get("time")
        # Chỉ cập nhật nếu timestamp cuối là datetime hợp lệ
        if isinstance(last_time, datetime):
            await attendances_collection.update_one(
                {"_id": record["_id"]},
                {"$set": {"check_out_time": last_time}}
            )
            updates += 1

    return updates

