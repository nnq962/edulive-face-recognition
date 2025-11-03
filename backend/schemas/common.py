# backend/schemas/common.py

from typing import Generic, Optional, TypeVar, Any, Dict
from pydantic import BaseModel, Field


T = TypeVar("T")

# ==================== Base Response ====================

class ApiResponse(BaseModel, Generic[T]):
    """Base API response"""
    success: bool
    message: str
    data: Optional[T] = None

# ==================== Pagination Meta ====================

class PaginationMeta(BaseModel):
    """Pagination metadata"""
    current_page: int = Field(..., description="Trang hiện tại")
    per_page: int = Field(..., description="Số items mỗi trang")
    total: int = Field(..., description="Tổng số items")
    total_pages: int = Field(..., description="Tổng số trang")
    from_: int = Field(..., alias="from", description="Item bắt đầu")
    to: int = Field(..., description="Item kết thúc")
    has_next: bool = Field(..., description="Có trang tiếp theo không")
    has_prev: bool = Field(..., description="Có trang trước không")
    
    class Config:
        populate_by_name = True  # Allow both 'from_' and 'from'

# ==================== Paginated Response ====================

class PaginatedResponse(BaseModel, Generic[T]):
    """Response with pagination"""
    success: bool = True
    message: str
    data: list[T]
    meta: PaginationMeta

# ==================== Generic Response with Meta ====================

class ApiResponseWithMeta(ApiResponse[T], Generic[T]):
    """Response with custom metadata"""
    meta: Dict[str, Any]

# ==================== Error Response ====================

class ApiError(BaseModel):
    """Error response"""
    success: bool = False
    message: str
    error_code: Optional[str] = None
    data: Optional[Dict[str, Any]] = None