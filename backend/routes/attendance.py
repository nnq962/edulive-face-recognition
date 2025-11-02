from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import FileResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
from typing import Optional, Literal
from pathlib import Path

from backend.schemas.attendance import (
    AttendanceResponse, 
    UserMonthlyAttendance,
    AttendanceDetectionRequest,
    AttendanceDetectionResponse
)
from backend.schemas.common import ApiError, PaginatedResponse
from backend.utils.pagination import PaginationParams
from backend.services.attendance import (
    get_user_attendances, 
    get_monthly_attendance_report, 
    get_monthly_attendance_report_for_export, 
    generate_excel_report,
    process_attendance_detections
)
from config.dependencies import get_db, get_current_active_user, require_admin
from utils import LOGGER
from utils.verify_api_key import verify_update_attendance_key

router = APIRouter(prefix="/api/attendances", tags=["Attendances"])


# ==================== Get My Attendances API (WITH PAGINATION) ====================
@router.get(
    "/me",
    response_model=PaginatedResponse[AttendanceResponse],
    summary="Lấy danh sách chấm công của user hiện tại",
    description="API lấy danh sách chấm công của user đang đăng nhập với phân trang và filter theo ngày",
    responses={
        401: {
            "model": ApiError,
            "description": "Unauthorized",
        },
        400: {
            "model": ApiError,
            "description": "Bad Request (validation / business rule)",
        },
        500: {
            "model": ApiError,
            "description": "Internal Server Error",
        },
    },
    response_model_exclude_none=True,
)
async def get_my_attendances(
    start_date: Optional[datetime] = Query(
        None,
        description="Ngày bắt đầu (ISO format: 2025-10-01T00:00:00Z)",
        example="2025-10-01T00:00:00Z"
    ),
    end_date: Optional[datetime] = Query(
        None,
        description="Ngày kết thúc (ISO format: 2025-10-31T23:59:59Z)",
        example="2025-10-31T23:59:59Z"
    ),
    pagination: PaginationParams = Depends(),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_active_user),
):
    """
    Lấy danh sách chấm công của user hiện tại
    
    **Parameters:**
    - start_date: Ngày bắt đầu filter (optional)
    - end_date: Ngày kết thúc filter (optional)
    - page: Trang hiện tại (default: 1)
    - limit: Số items mỗi trang (default: 10, max: 100)
    - sort: Trường sắp xếp (default: "date")
    - order: Thứ tự sắp xếp asc/desc (default: "desc")
    
    **Returns:**
    - Danh sách attendance với pagination metadata
    """
    
    try:
        # Khởi tạo service
        user_id = current_user["id"]
        
        # Gọi service để lấy data
        attendances, pagination_meta = await get_user_attendances(
            db=db,
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
            pagination=pagination
        )
        
        return PaginatedResponse(
            success=True,
            message="Successfully fetched attendance list",
            data=attendances,
            meta=pagination_meta
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error: {str(e)}"
        )


# ==================== View Image from Attendance API ====================
@router.get(
    "/me/{date}/images/{type}",
    summary="Xem ảnh check in/out của user",
    description="API để xem ảnh chấm công (check in hoặc check out) theo ngày",
    responses={
        200: {
            "content": {"image/jpeg": {}},
            "description": "Trả về file ảnh",
        },
        401: {
            "model": ApiError,
            "description": "Unauthorized",
        },
        404: {
            "model": ApiError,
            "description": "Image not found",
        },
        500: {
            "model": ApiError,
            "description": "Internal Server Error",
        },
    },
)
async def get_attendance_image(
    date: str,
    type: Literal["check_in", "check_out"],
    current_user: dict = Depends(get_current_active_user),
):
    """
    Xem ảnh chấm công của user hiện tại
    
    **Parameters:**
    - date: Ngày cần xem (YYYY-MM-DD) - path parameter
    - type: Loại ảnh (check_in hoặc check_out) - path parameter
    
    **Returns:**
    - File ảnh (JPEG)
    
    **Example:**
    - GET /api/attendances/me/2025-10-01/images/check_in
    - GET /api/attendances/me/2025-10-01/images/check_out
    """
    
    try:
        # Lấy data_directory từ current_user
        data_directory = current_user.get("data_directory")
        if not data_directory:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="User data directory not found"
            )
        
        # Xác định tên file dựa vào type
        image_filename = f"{type}.jpg"
        
        # Tạo đường dẫn đến file ảnh
        # Format: {data_directory}/attendances/{date}/{type}.jpg
        image_path = Path(data_directory) / "attendances" / date / image_filename
        
        LOGGER.info(f"Attempting to serve image: {image_path}")
        
        # Kiểm tra file có tồn tại không
        if not image_path.exists():
            LOGGER.warning(f"Image not found: {image_path}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Image not found for date {date} and type {type}"
            )
        
        # Kiểm tra file có phải là file (không phải folder)
        if not image_path.is_file():
            LOGGER.warning(f"Path is not a file: {image_path}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Invalid image path"
            )
        
        # Trả về file ảnh
        return FileResponse(
            path=str(image_path),
            media_type="image/jpeg",
            filename=image_filename
        )
        
    except HTTPException:
        raise
    except Exception as e:
        LOGGER.error(f"Error serving image: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error serving image: {str(e)}"
        )


# ==================== Get Monthly Attendance Report API ====================
@router.get(
    "/monthly-report",
    response_model=PaginatedResponse[UserMonthlyAttendance],
    summary="Lấy báo cáo chấm công theo tháng cho toàn bộ users",
    description="API lấy báo cáo chấm công theo tháng với pagination. Mỗi user sẽ có đầy đủ các ngày trong tháng, ngày không có dữ liệu thì trả về None.",
    responses={
        400: {
            "model": ApiError,
            "description": "Bad Request (invalid month format)",
        },
        401: {
            "model": ApiError,
            "description": "Unauthorized",
        },
        500: {
            "model": ApiError,
            "description": "Internal Server Error",
        },
    },
    response_model_exclude_none=True,
)
async def get_monthly_report(
    month: str = Query(
        ...,
        description="Tháng cần lấy báo cáo (format: YYYY-MM)",
        example="2025-10",
        regex=r"^\d{4}-\d{2}$"
    ),
    page: int = Query(
        1,
        ge=1,
        description="Trang hiện tại (bắt đầu từ 1)"
    ),
    limit: int = Query(
        10,
        ge=1,
        le=100,
        description="Số items mỗi trang (max 100)"
    ),
    user_id: Optional[str] = Query(
        None,
        description="Lọc theo user_id cụ thể (optional)",
        example="69009a95f8f19decdd27172a"
    ),
    date: Optional[str] = Query(
        None,
        description="Lọc theo ngày cụ thể (format: YYYY-MM-DD, optional)",
        example="2025-10-01",
        regex=r"^\d{4}-\d{2}-\d{2}$"
    ),
    department: Optional[str] = Query(
        None,
        description="Lọc theo phòng ban (tên phòng ban, optional)",
        example="Tầng 1"
    ),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """
    Lấy báo cáo chấm công theo tháng cho toàn bộ users với filtering
    
    **Parameters:**
    - month: Tháng cần lấy báo cáo (format: YYYY-MM, ví dụ: 2025-10)
    - page: Trang hiện tại (default: 1)
    - limit: Số items mỗi trang (default: 10, max: 100)
    - user_id: Lọc theo user_id cụ thể (optional)
    - date: Lọc theo ngày cụ thể (format: YYYY-MM-DD, optional)
    - department: Lọc theo tên phòng ban (optional)
    
    **Logic:**
    - Mỗi user sẽ có đầy đủ các ngày trong tháng (30/31 ngày)
    - Ngày nào không có dữ liệu thì check_in_time và check_out_time = None
    - Filter được áp dụng trước pagination
    - Pagination áp dụng trên flatten list theo thứ tự: 
      30 ngày của user A -> 30 ngày của user B -> ...
    
    **Use cases:**
    1. Xem tất cả users trong 1 ngày cụ thể:
       GET /api/attendances/monthly-report?month=2025-10&date=2025-10-01&limit=100
    
    2. Xem 1 user cụ thể trong cả tháng:
       GET /api/attendances/monthly-report?month=2025-10&user_id=xxx&limit=100
    
    3. Lọc theo phòng ban:
       GET /api/attendances/monthly-report?month=2025-10&department=Tầng 1&limit=100
    
    **Returns:**
    - Danh sách user monthly attendances với pagination metadata
    """
    
    try:
        # Validate month format
        if not month or len(month.split("-")) != 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid month format. Expected format: YYYY-MM (e.g., 2025-10)"
            )
        
        # Gọi service để lấy data
        data, pagination_meta = await get_monthly_attendance_report(
            db=db,
            month_str=month,
            page=page,
            limit=limit,
            user_id=user_id,
            filter_date=date,
            department=department
        )
        
        return PaginatedResponse(
            success=True,
            message=f"Successfully fetched monthly attendance report for {month}",
            data=data,  # data đã là list[UserMonthlyAttendance] rồi
            meta=pagination_meta
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        LOGGER.error(f"Error fetching monthly attendance report: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error: {str(e)}"
        )


# ==================== Export Monthly Attendance Report to Excel API ====================
@router.get(
    "/monthly-report/export",
    summary="Xuất báo cáo chấm công theo tháng ra file Excel",
    description="API xuất báo cáo chấm công theo tháng ra file Excel. Giống API /monthly-report nhưng KHÔNG có pagination và trả về file Excel thay vì JSON.",
    responses={
        200: {
            "content": {"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {}},
            "description": "Trả về file Excel",
        },
        400: {
            "model": ApiError,
            "description": "Bad Request (invalid month format)",
        },
        401: {
            "model": ApiError,
            "description": "Unauthorized",
        },
        500: {
            "model": ApiError,
            "description": "Internal Server Error",
        },
    },
)
async def export_monthly_report_excel(
    month: str = Query(
        ...,
        description="Tháng cần lấy báo cáo (format: YYYY-MM)",
        example="2025-10",
        regex=r"^\d{4}-\d{2}$"
    ),
    user_id: Optional[str] = Query(
        None,
        description="Lọc theo user_id cụ thể (optional)",
        example="69009a95f8f19decdd27172a"
    ),
    date: Optional[str] = Query(
        None,
        description="Lọc theo ngày cụ thể (format: YYYY-MM-DD, optional)",
        example="2025-10-01",
        regex=r"^\d{4}-\d{2}-\d{2}$"
    ),
    department: Optional[str] = Query(
        None,
        description="Lọc theo phòng ban (tên phòng ban, optional)",
        example="Tầng 1"
    ),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """
    Xuất báo cáo chấm công theo tháng ra file Excel
    
    **Parameters:**
    - month: Tháng cần lấy báo cáo (format: YYYY-MM, ví dụ: 2025-10)
    - user_id: Lọc theo user_id cụ thể (optional)
    - date: Lọc theo ngày cụ thể (format: YYYY-MM-DD, optional)
    - department: Lọc theo tên phòng ban (optional)
    
    **Khác biệt với /monthly-report:**
    - KHÔNG có pagination (page, limit)
    - Lấy TẤT CẢ data theo filters
    - Trả về file Excel thay vì JSON
    
    **Use cases:**
    1. Xuất tất cả users trong tháng:
       GET /api/attendances/monthly-report/export?month=2025-10
    
    2. Xuất theo phòng ban:
       GET /api/attendances/monthly-report/export?month=2025-10&department=Tầng 1
    
    3. Xuất 1 user cụ thể:
       GET /api/attendances/monthly-report/export?month=2025-10&user_id=xxx
    
    4. Xuất 1 ngày cụ thể:
       GET /api/attendances/monthly-report/export?month=2025-10&date=2025-10-15
    
    **Returns:**
    - File Excel (.xlsx)
    """
    
    try:
        # Validate month format
        if not month or len(month.split("-")) != 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid month format. Expected format: YYYY-MM (e.g., 2025-10)"
            )
        
        LOGGER.info(f"Exporting monthly report for month: {month}, filters: user_id={user_id}, date={date}, department={department}")
        
        # Gọi service để lấy data (KHÔNG pagination)
        data = await get_monthly_attendance_report_for_export(
            db=db,
            month_str=month,
            user_id=user_id,
            filter_date=date,
            department=department
        )
        
        # Kiểm tra nếu không có data
        if not data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No attendance records found for the given filters"
            )
        
        LOGGER.info(f"Generating Excel file with {len(data)} records")
        
        # Generate Excel file
        excel_filepath = generate_excel_report(data, month)
        
        LOGGER.info(f"Excel file generated at: {excel_filepath}")
        
        # Trả về file Excel
        return FileResponse(
            path=excel_filepath,
            filename=f"attendance_report_{month}.xlsx",
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            background=None  # File sẽ bị xóa sau khi gửi xong
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        LOGGER.error(f"Error exporting monthly attendance report: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error: {str(e)}"
        )


# ==================== Process Attendance Detection API ====================
@router.post(
    "/update",
    response_model=AttendanceDetectionResponse,
    summary="Xử lý batch detections từ client",
    description="API nhận batch detections từ client (nhiều user, nhiều camera), xử lý logic chấm công và trả về kết quả cần hiển thị welcome/goodbye.",
    responses={
        400: {
            "model": ApiError,
            "description": "Bad Request (validation error)",
        },
        500: {
            "model": ApiError,
            "description": "Internal Server Error",
        },
    },
    response_model_exclude_none=True,
)
async def process_detections(
    request: AttendanceDetectionRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _: bool = Depends(verify_update_attendance_key),
):
    """
    Xử lý batch detections từ client
    
    **Request Body:**
    ```json
    {
      "timestamp": "2025-10-31T10:43:22Z",
      "data": [
        {
          "user_id": "69009a95f8f19decdd27172a",
          "camera_id": "CAM6",
          "similarity": 0.95
        },
        {
          "user_id": "69009a95f8f19decdd27172b",
          "camera_id": "CAM7",
          "similarity": 0.88
        }
      ]
    }
    ```
    
    **Business Logic:**
    1. Check-in: Lần đầu tiên trong ngày xuất hiện (trước 17h30)
    2. Check-out: Sau 17h30, check_out_time luôn là timestamp cuối cùng
    3. Welcome: Chỉ hiển thị 1 lần khi check-in đầu tiên
    4. Goodbye: Sau 17h30 khi detect được
    5. Sau 17h30: Không cho check-in nữa, chỉ có check-out
    6. check_in_time luôn là timestamp đầu tiên
    7. check_out_time chỉ update sau 17h30
    
    **Response:**
    ```json
    {
      "success": true,
      "message": "Detection processed successfully",
      "results": [
        {
          "user_id": "69009a95f8f19decdd27172a",
          "full_name": "Nguyễn Ngọc Quyết",
          "action": "check_in",
          "show_welcome": true,
          "show_goodbye": false,
          "message": "Chào mừng Quyết đến công ty!"
        }
      ]
    }
    ```
    
    **Actions:**
    - `check_in`: Check-in đầu tiên trong ngày
    - `check_out`: Check-out sau 17h30
    - `timestamp_added`: Chỉ thêm timestamp, không có welcome/goodbye
    - `after_hours_only`: Sau 17h30 chỉ có check-out, không có check-in
    """

    try:
        LOGGER.info(f"Processing {len(request.data)} detections at {request.timestamp}")
        
        # Convert Pydantic models sang dict để truyền vào service
        detections = [
            {
                "user_id": item.user_id,
                "camera_id": item.camera_id,
                "similarity": item.similarity
            }
            for item in request.data
        ]
        
        # Gọi service xử lý
        results = await process_attendance_detections(
            db=db,
            timestamp=request.timestamp,
            detections=detections
        )
        
        LOGGER.info(f"Successfully processed {len(results)} users")
        
        return AttendanceDetectionResponse(
            success=True,
            message=f"Successfully processed {len(results)} detections",
            results=results
        )
        
    except Exception as e:
        LOGGER.error(f"Error processing detections: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing detections: {str(e)}"
        )

