from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import FileResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
from typing import Optional, Literal
from pathlib import Path

from backend.schemas.attendance import AttendanceResponse
from backend.schemas.common import ApiError, PaginatedResponse
from backend.utils.pagination import PaginationParams
from backend.services.attendance import get_user_attendances
from config.dependencies import get_db, get_current_active_user
from utils import LOGGER

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
        LOGGER.info(f"Current user: {current_user}")
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
