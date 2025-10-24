# backend/routes/user.py

from fastapi import APIRouter, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from backend.schemas.user import UserCreate, UserCreateResponse
from backend.schemas.common import ApiResponse, ApiError
from backend.services.user import create_user, fetch_all_users
from config.dependencies import get_db, require_admin
from backend.utils.permissions import ensure_can_manage
from typing import List


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


# ==================== Get All Users API ====================
@router.get("/", response_model=ApiResponse[List[UserCreateResponse]])
async def get_all_users(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """
    **Lấy danh sách tất cả users**

    - Chỉ admin hoặc super_admin được phép xem danh sách users
    """
    users = await fetch_all_users(db)
    payload = [UserCreateResponse(**user) for user in users]

    return ApiResponse[List[UserCreateResponse]](
        success=True,
        message="Successfully fetched users",
        data=payload,
    )