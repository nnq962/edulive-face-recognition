# backend/utils/pagination.py

from typing import Literal
from pydantic import BaseModel, Field, field_validator
from math import ceil


class PaginationParams(BaseModel):
    """Query parameters cho pagination"""
    
    page: int = Field(1, ge=1, description="Trang hiện tại (bắt đầu từ 1)")
    limit: int = Field(10, ge=1, le=100, description="Số items mỗi trang (max 100)")
    sort: str = Field("created_at", description="Trường để sắp xếp")
    order: Literal["asc", "desc"] = Field("desc", description="Thứ tự sắp xếp (asc/desc)")
    
    @field_validator("limit")
    @classmethod
    def validate_limit(cls, v):
        if v > 100:
            raise ValueError("Limit không được vượt quá 100")
        return v
    
    @property
    def skip(self) -> int:
        """Tính offset cho database query"""
        return (self.page - 1) * self.limit
    
    @property
    def sort_direction(self) -> int:
        """Convert order string thành MongoDB sort direction"""
        return 1 if self.order == "asc" else -1


def calculate_pagination_meta(
    page: int,
    limit: int,
    total: int
) -> dict:
    """
    Tính toán pagination metadata
    
    Args:
        page: Trang hiện tại
        limit: Số items mỗi trang
        total: Tổng số items
    
    Returns:
        dict: Pagination metadata
    """
    total_pages = ceil(total / limit) if limit > 0 else 0
    from_ = (page - 1) * limit + 1 if total > 0 else 0
    to = min(page * limit, total)
    
    return {
        "current_page": page,
        "per_page": limit,
        "total": total,
        "total_pages": total_pages,
        "from": from_,
        "to": to,
        "has_next": page < total_pages,
        "has_prev": page > 1,
    }
