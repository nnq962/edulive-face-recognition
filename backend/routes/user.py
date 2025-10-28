# backend/routes/user.py

import os
from fastapi import APIRouter, Depends, status, Query, HTTPException, File, UploadFile
from fastapi.responses import FileResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from backend.schemas.user import UserCreate, UserCreateResponse, UserUpdate, UserUpdateResponse
from backend.schemas.common import ApiResponse, ApiError, PaginatedResponse, ApiResponseWithMeta
from backend.services.user import create_user, fetch_users_with_pagination, delete_user, update_user, upload_user_faces
from backend.utils.pagination import PaginationParams, calculate_pagination_meta
from backend.utils.filters import UserFilterParams
from config.dependencies import get_db, require_admin
from backend.utils.permissions import ensure_can_manage
from typing import Optional, Literal
from utils.logger import LOGGER
from typing import List
from pathlib import Path


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
    LOGGER.info(f"Created user: {created_user}")

    payload = UserCreateResponse(
        id=created_user["_id"],
        username=created_user["username"],
        email=created_user["email"],
        full_name=created_user["full_name"],
        role=created_user["role"],
        position=created_user["position"],
        department=created_user["department"],
        data_directory=created_user.get("data_directory"),
        telegram_username=created_user.get("telegram_username"),
        is_active=created_user.get("is_active", True),
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


# ==================== Delete User API ====================
@router.delete(
    "/{user_id}",
    status_code=status.HTTP_200_OK,
    response_model=ApiResponse[None],
    responses={
        403: {
            "model": ApiError,
            "description": "Forbidden (requires admin privileges)",
        },
        404: {
            "model": ApiError,
            "description": "User not found",
        },
        500: {
            "model": ApiError,
            "description": "Internal Server Error",
        },
    },
)
async def delete_user_by_id(
    user_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """
    **Xóa user theo ID**

    - Chỉ admin hoặc super_admin được phép xóa user
    - Không thể xóa chính mình
    - Admin không thể xóa super_admin
    
    **Ví dụ:**
    - DELETE /api/users/507f1f77bcf86cd799439011
    """
    # Kiểm tra không thể xóa chính mình
    current_user_id_str = str(current_user.get("id", ""))
    LOGGER.info(f"Current user ID: {current_user_id_str}")
    LOGGER.info(f"User ID to delete: {user_id}")
    if current_user_id_str == user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete yourself"
        )
    
    # Lấy thông tin user sắp xóa để kiểm tra quyền
    users_collection = db["users"]
    
    try:
        target_user_id = ObjectId(user_id)
    except Exception:
        target_user_id = user_id
    
    target_user = await users_collection.find_one({"_id": target_user_id})
    
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Kiểm tra quyền: Admin không thể xóa super_admin
    ensure_can_manage(current_user["role"], target_user["role"], action="delete")
    
    # Xóa user
    success = await delete_user(db, user_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return ApiResponse[None](
        success=True,
        message=f"Successfully deleted user {user_id}",
        data=None,
    )


# ==================== Update User API ====================
@router.put(
    "/{user_id}",
    response_model=ApiResponse[UserUpdateResponse],
    response_model_exclude_none=True,
    responses={
        403: {
            "model": ApiError,
            "description": "Forbidden (requires admin privileges)",
        },
        404: {
            "model": ApiError,
            "description": "User not found",
        },
        500: {
            "model": ApiError,
            "description": "Internal Server Error",
        },
    },
)
async def update_user_route(
    user_id: str,
    payload: UserUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """
    Cập nhật thông tin user theo ID (chuẩn RESTful)
    - Chặn admin sửa hoặc hạ quyền super_admin
    - Chặn admin nâng role người khác vượt quyền của mình
    """

    # 1. Lấy thông tin user hiện tại từ DB
    target_user = await db["users"].find_one({"_id": ObjectId(user_id)})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    LOGGER.info(f"Current user: {current_user}")
    LOGGER.info(f"Target user (before update): {target_user}")
    LOGGER.info(f"Payload: {payload}")
    LOGGER.info(f"User ID: {user_id}")

    # 2. Check quyền trên role cũ
    ensure_can_manage(
        requester_role=current_user["role"],
        target_role=target_user["role"],
        action="update existing",
    )

    # 3. Check quyền trên role mới (nếu có thay đổi role)
    if payload.role and payload.role != target_user["role"]:
        ensure_can_manage(
            requester_role=current_user["role"],
            target_role=payload.role,
            action="assign new role",
        )

    # 4. Thực hiện update
    updated = await update_user(db, user_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="User not found after update")

    LOGGER.info(f"User updated successfully: {updated}")

    return ApiResponse[UserUpdateResponse](
        success=True,
        message="Successfully updated user",
        data=updated,
    )


# ==================== Upload User Faces API ====================
@router.post(
    "/{user_id}/faces",
    response_model=ApiResponseWithMeta[List[str]],
    response_model_exclude_none=True,
    responses={
        403: {
            "model": ApiError,
            "description": "Forbidden (requires admin privileges)",
        },
        404: {
            "model": ApiError,
            "description": "User not found",
        },
        500: {
            "model": ApiError,
            "description": "Internal Server Error",
        },
    },
)
async def upload_user_faces_route(
    user_id: str,
    files: List[UploadFile] = File(...),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """
    Upload nhiều ảnh khuôn mặt cho user.
        - Lưu ảnh hợp lệ
        - Bỏ qua ảnh không hợp lệ
    """
    # 1. Lấy thông tin user hiện tại từ DB
    target_user = await db["users"].find_one({"_id": ObjectId(user_id)})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    # 2. Check quyền
    ensure_can_manage(current_user["role"], target_user["role"], action="upload photos of faces")

    # 3. Upload ảnh khuôn mặt
    result = await upload_user_faces(db, user_id, files)

    return ApiResponseWithMeta[List[str]](
        success=True if result["meta"]["valid_count"] > 0 else False,
        message=(
            f"Uploaded {result['meta']['valid_count']} valid and "
            f"{result['meta']['invalid_count']} invalid face image(s)"
        ),
        data=result["photos_path"],
        meta={
            "valid_count": result["meta"]["valid_count"],
            "invalid_count": result["meta"]["invalid_count"],
            "total_uploaded": result["meta"]["total_uploaded"],
            "invalid_files": result["invalid_files"],
        },
    )


# ==================== Get User Faces API ====================
@router.get(
    "/{user_id}/faces",
    response_model=ApiResponse[List[str]],
    response_model_exclude_none=True,
    responses={
        403: {
            "model": ApiError,
            "description": "Forbidden (requires admin privileges)",
        },
        404: {
            "model": ApiError,
            "description": "User not found",
        },
        500: {
            "model": ApiError,
            "description": "Internal Server Error",
        },  
    },
)
async def get_user_faces_route(
    user_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """
    Lấy danh sách ảnh khuôn mặt của user.
    """
    # 1. Kiểm tra user tồn tại
    user = await db["users"].find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    photos_path = user.get("photos_path", [])

    return ApiResponse[List[str]](
        success=True,
        message=f"Found {len(photos_path)} face image(s)",
        data=photos_path,
    )


# ==================== View User Faces API ====================
@router.get(
    "/{user_id}/faces/{filename}",
)
async def view_user_faces_route(
    user_id: str,
    filename: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """
    Xem ảnh khuôn mặt của user.
    """
    # 1. Kiểm tra user
    user = await db["users"].find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 2. Xác định file path
    faces_dir = Path(user["data_directory"]) / "faces"
    file_path = faces_dir / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Face image not found")

    return FileResponse(
        path=file_path,
        media_type="image/jpeg",
        filename=filename
    )


# ==================== Delete User Faces API ====================
@router.delete(
    "/{user_id}/faces/{filename}",
    response_model=ApiResponse[None],
    response_model_exclude_none=True,
    responses={
        403: {
            "model": ApiError,
            "description": "Forbidden (requires admin privileges)",
        },
        404: {
            "model": ApiError,
            "description": "User not found",
        },
        500: {
            "model": ApiError,
            "description": "Internal Server Error",
        },
    },
)
async def delete_user_faces_route(
    user_id: str,
    filename: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """
    Xóa 1 ảnh khuôn mặt của user.
    """
    # 1. Kiểm tra user tồn tại
    user = await db["users"].find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 2. Tìm file path
    faces_dir = Path(user["data_directory"]) / "faces"
    file_path = faces_dir / filename

    # 3. Kiểm tra file tồn tại
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Face image not found")

    try:
        # 4. Xóa file vật lý
        os.remove(file_path)

        # 5. Xóa khỏi DB (nếu có trong danh sách)
        await db["users"].update_one(
            {"_id": ObjectId(user_id)},
            {"$pull": {"photos_path": f"{filename}"}},
        )

        return ApiResponse[None](
            success=True,
            message=f"Face image '{filename}' deleted successfully",
            data=None,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete image: {e}")