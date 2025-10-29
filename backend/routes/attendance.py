from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
from typing import Optional

from backend.schemas.attendance import AttendanceResponse
from backend.schemas.common import ApiError, PaginatedResponse
from backend.utils.pagination import PaginationParams
from backend.services.attendance import get_user_attendances
from config.dependencies import get_db, get_current_active_user

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


# ==================== Get Image from Attendance API ====================
