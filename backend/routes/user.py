# backend/routes/user.py

from fastapi import APIRouter, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from backend.schemas.user import UserCreate, UserCreateResponse
from backend.schemas.common import ApiResponse, ApiError
from backend.services.user import create_user
from config.dependencies import get_db
from utils import LOGGER


router = APIRouter(prefix="/api/users", tags=["Users"])


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    response_model=ApiResponse[UserCreateResponse],   # 👈 show schema success
    response_model_exclude_none=True,
    responses={                                       # 👈 show schema lỗi trong docs
        400: {
            "model": ApiError,
            "description": "Bad Request (validation / business rule)",
        },
        500: {
            "model": ApiError,
            "description": "Internal Server Error",
        },
    },
)
async def create_new_user(
    user_data: UserCreate,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    **Tạo user mới**

    - Username và email sẽ được tự động sinh từ họ tên
    - Password mặc định: "123456"

    **Logic sinh username:**
    - "Nguyễn Ngọc Quyết" → "quyetnn"
    - Nếu trùng → thêm số (quyetnn2, quyetnn3, ...)

    **Email:** username@edulive.net
    """
    # Service có thể raise ValueError / HTTPException / Exception
    created_user = await create_user(db, user_data)

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