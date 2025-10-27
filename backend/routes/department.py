# backend/routes/department.py

from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Literal, Optional, List

from backend.schemas.department import DepartmentCreate, DepartmentCreateResponse, DepartmentDelete, DepartmentDeleteResponse, DepartmentEdit, DepartmentEditResponse
from backend.services.department import create_department, get_departments, delete_department, update_department
from backend.schemas.common import ApiResponse, ApiError, PaginatedResponse
from backend.utils.pagination import calculate_pagination_meta
from config.dependencies import get_db, require_admin


router = APIRouter(prefix="/api/departments", tags=["Departments"])


# ==================== Create Department API ====================
@router.post(
    "/", 
    response_model=ApiResponse[DepartmentCreateResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Tạo phòng ban mới",
    description="Tạo một phòng ban mới trong hệ thống",
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
async def create_department_route(
    department_data: DepartmentCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """
    **Tạo phòng ban mới**
    
    - Chỉ admin hoặc super_admin được phép tạo phòng ban
    - Tên phòng ban phải unique (không phân biệt hoa thường)
    
    **Ví dụ:**
    ```json
    {
        "name": "AI Center"
    }
    ```
    """
    try:
        created = await create_department(db, department_data)
        return ApiResponse[DepartmentCreateResponse](
            success=True,
            message=f"Tạo phòng ban '{created['name']}' thành công",
            data=DepartmentCreateResponse(
                id=created["_id"],
                name=created["name"],
            )
        )
    except ValueError as e:
        # Lỗi trùng tên hoặc validate
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {e}")


# ==================== Get All Departments API (WITH PAGINATION) ====================
@router.get(
    "/",
    response_model=PaginatedResponse[DepartmentCreateResponse],
    response_model_exclude_none=True,
    summary="Lấy danh sách phòng ban",
    description="Trả về danh sách tất cả phòng ban, hỗ trợ phân trang và tìm kiếm",
    responses={
        403: {
            "model": ApiError,
            "description": "Forbidden (requires admin privileges)",
        },
    },
)
async def get_departments_route(
    page: int = Query(1, ge=1, description="Trang hiện tại"),
    limit: int = Query(20, ge=1, le=100, description="Số items mỗi trang"),
    sort: str = Query("created_at", description="Trường để sắp xếp"),
    order: Literal["asc", "desc"] = Query("desc", description="Thứ tự sắp xếp"),
    search: Optional[str] = Query(None, description="Tìm kiếm theo tên phòng ban"),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """
    **Lấy danh sách phòng ban với pagination**
    
    - Chỉ admin hoặc super_admin được phép xem danh sách phòng ban
    - Hỗ trợ pagination: `page`, `limit`, `sort`, `order`
    - Hỗ trợ tìm kiếm: `search`
    
    **Ví dụ:**
    - Lấy trang 1: `?page=1&limit=20`
    - Tìm kiếm "AI": `?search=AI`
    - Sắp xếp theo tên: `?sort=name&order=asc`
    """
    try:
        departments, total = await get_departments(db, page, limit, sort, order, search)
        
        # Convert to response model
        payload = [
            DepartmentCreateResponse(
                id=dept["id"],
                name=dept["name"]
            ) 
            for dept in departments
        ]
        
        # Calculate pagination meta
        meta = calculate_pagination_meta(page, limit, total)
        
        return PaginatedResponse[DepartmentCreateResponse](
            success=True,
            message="Successfully fetched departments",
            data=payload,
            meta=meta,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {e}")


# ==================== Delete Department API ====================
@router.delete(
    "/",
    response_model=ApiResponse[DepartmentDeleteResponse],
    summary="Xóa phòng ban",
    description="Xóa một phòng ban theo ID. Nếu phòng ban đang được sử dụng, không thể xóa.",
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
async def delete_department_route(
    body: DepartmentDelete,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    try:
        deleted = await delete_department(db, body.id)

        return ApiResponse[DepartmentDeleteResponse](
            success=True,
            message=f"Đã xóa phòng ban '{deleted['name']}' thành công",
            data=deleted
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {e}")


# ==================== Edit Department API ====================
@router.put(
    "/",
    response_model=ApiResponse[DepartmentEditResponse],
    summary="Sửa phòng ban",
    description="Cập nhật tên phòng ban theo ID. Nếu tên mới trùng hoặc không tồn tại thì báo lỗi.",
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
async def edit_department_route(
    body: DepartmentEdit,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    try:
        updated = await update_department(db, body.id, body.name)

        return ApiResponse[DepartmentEditResponse](
            success=True,
            message=f"Cập nhật phòng ban '{updated['id']}' thành '{updated['name']}' thành công",
            data=updated
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {e}")