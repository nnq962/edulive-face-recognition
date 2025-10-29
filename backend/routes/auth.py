# backend/routes/auth.py

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from backend.schemas.auth import LoginRequest, LoginResponse
from backend.schemas.common import ApiResponse, ApiError
from backend.services.auth import authenticate_user, refresh_access_token
from config.dependencies import get_db, get_current_active_user
from backend.utils.jwt import create_access_token, create_refresh_token
from backend.schemas.auth import RefreshRequest, RefreshResponse, GetMeResponse
from utils import LOGGER


router = APIRouter(prefix="/api/auth", tags=["Auth"])


# ==================== Login API ====================
@router.post(
    "/login",
    response_model=ApiResponse[LoginResponse],
    responses={
        401: {
            "model": ApiError,
            "description": "Invalid username or password"
        },
        422: {
            "model": ApiError,
            "description": "Validation error"
        },
        500: {
            "model": ApiError,
            "description": "Internal Server Error"
        },
    },
    response_model_exclude_none=True,
)
async def login(
    request: LoginRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    user = await authenticate_user(db, request.username_or_email, request.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username or password is incorrect"
        )
    access_token = create_access_token(str(user["_id"]))

    if request.remember_me:
        refresh_token = create_refresh_token(str(user["_id"]))
    else:
        refresh_token = None

    return ApiResponse(
        success=True,
        message="Successfully logged in",
        data=LoginResponse(access_token=access_token, refresh_token=refresh_token),
    )


# ==================== Refresh Token API ====================
@router.post(
    "/refresh",
    response_model=ApiResponse[RefreshResponse],
    responses={
        401: {"model": ApiError, "description": "Invalid or expired refresh token"},
        500: {"model": ApiError, "description": "Internal Server Error"},
    },
)
async def refresh_token(request: RefreshRequest):
    new_access_token = await refresh_access_token(request.refresh_token)
    response = RefreshResponse(
        access_token=new_access_token,
        token_type="bearer",
        expires_in=1800,
    )
    return {
        "success": True,
        "message": "Access token refreshed successfully",
        "data": response,
    }


# ==================== Get me ====================
@router.get("/me",
    response_model=ApiResponse[GetMeResponse],
    response_model_exclude_none=True,
    responses={
        401: {"model": ApiError, "description": "Unauthorized"},
        500: {"model": ApiError, "description": "Internal Server Error"},
        403: {"model": ApiError, "description": "Forbidden"},
    },
)
async def get_me(current_user: dict = Depends(get_current_active_user)):
    LOGGER.info(f"Current user: {current_user}")
    return ApiResponse(
        success=True,
        message="User info",
        data=GetMeResponse(**current_user),
    )