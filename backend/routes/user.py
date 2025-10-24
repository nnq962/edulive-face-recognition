# backend/routes/user.py

from fastapi import APIRouter, Depends, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from backend.schemas.user import UserCreate, UserCreateResponse
from backend.schemas.common import ApiResponse, ApiError, PaginatedResponse
from backend.services.user import create_user, fetch_all_users, fetch_users_with_pagination
from backend.utils.pagination import PaginationParams, calculate_pagination_meta
from backend.utils.filters import UserFilterParams
from config.dependencies import get_db, require_admin
from backend.utils.permissions import ensure_can_manage
from typing import List, Optional, Literal


router = APIRouter(prefix="/api/users", tags=["Users"])

# ==================== Create User API ====================
@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    response_model=ApiResponse[UserCreateResponse],
    response_model_exclude_none=True,
    responses={
        400: {
            "model": ApiError,
            "description": "Bad Request (validation / business rule)",
        },
        403: {
            "model": ApiError,
            "description": "Forbidden (requires admin privileges)",
        },
        500: {
            "model": ApiError,
            "description": "Internal Server Error",
        },
    },
)
async def create_new_user(
    request: UserCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """
    **Tạo user mới**

    - Chỉ admin hoặc super_admin được phép tạo tài khoản
    - Username và email sẽ được tự động sinh từ họ tên
    - Password mặc định: "123456"
    """
    ensure_can_manage(current_user["role"], request.role, action="create")
    created_user = await create_user(db, request)

    payload = UserCreateResponse(
        id=created_user["_id"],
        username=created_user["username"],
        email=created_user["email"],
        full_name=created_user["full_name"],
        role=created_user["role"],
        position=created_user["position"],
        department=created_user["department"],
        telegram_username=created_user.get("telegram_username"),
    )

    return ApiResponse[UserCreateResponse](
        success=True,
        message="Successfully created user",
        data=payload,
    )


# ==================== Get All Users API (WITH PAGINATION & FILTERS) ====================
@router.get(
    "/",
    response_model=PaginatedResponse[UserCreateResponse],
    response_model_exclude_none=True,
    responses={
        403: {
            "model": ApiError,
            "description": "Forbidden (requires admin privileges)",
        },
    },
)
async def get_users(
    # Pagination parameters
    page: int = Query(1, ge=1, description="Trang hiện tại"),
    limit: int = Query(20, ge=1, le=100, description="Số items mỗi trang"),
    sort: str = Query("created_at", description="Trường để sắp xếp"),
    order: Literal["asc", "desc"] = Query("desc", description="Thứ tự sắp xếp"),
    # Filter parameters
    id: Optional[str] = Query(None, description="Lọc theo user ID"),
    role: Optional[Literal["user", "admin", "super_admin"]] = Query(None, description="Lọc theo role"),
    position: Optional[str] = Query(None, description="Lọc theo chức vụ"),
    department: Optional[str] = Query(None, description="Lọc theo phòng ban"),
    is_active: Optional[bool] = Query(None, description="Lọc theo trạng thái"),
    search: Optional[str] = Query(None, description="Tìm kiếm"),
    # Dependencies
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """
    **Lấy danh sách users với pagination và filters**

    - Chỉ admin hoặc super_admin được phép xem danh sách users
    - Hỗ trợ pagination: `page`, `limit`, `sort`, `order`
    - Hỗ trợ filters: `id`, `role`, `position`, `department`, `is_active`, `search`
    
    **Ví dụ:**
    - Lấy trang 2, mỗi trang 20 items: `?page=2&limit=20`
    - Lọc admin: `?role=admin`
    - Tìm kiếm "nguyen": `?search=nguyen`
    - Sắp xếp theo tên: `?sort=full_name&order=asc`
    - Combine: `?page=1&limit=10&role=admin&department=AI&is_active=true&search=nguyen`
    """
    # Tạo pagination params
    pagination = PaginationParams(
        page=page,
        limit=limit,
        sort=sort,
        order=order,
    )
    
    # Tạo filter params
    filters = UserFilterParams(
        id=id,
        role=role,
        position=position,
        department=department,
        is_active=is_active,
        search=search,
    )
    
    # Fetch users với pagination và filters
    users, total = await fetch_users_with_pagination(db, pagination, filters)
    
    # Convert to response model
    payload = [UserCreateResponse(**user) for user in users]
    
    # Calculate pagination meta
    meta = calculate_pagination_meta(pagination.page, pagination.limit, total)
    
    return PaginatedResponse[UserCreateResponse](
        success=True,
        message="Successfully fetched users",
        data=payload,
        meta=meta,
    )