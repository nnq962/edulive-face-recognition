# backend/schemas/department.py

from pydantic import BaseModel, Field

# ==================== Request Schemas ====================
class DepartmentCreate(BaseModel):
    """
    Schema để TẠO department mới
    """
    name: str = Field(..., example="AI Center", min_length=1, max_length=100)


class DepartmentDelete(BaseModel):
    """
    Schema để XÓA department
    """
    id: str = Field(..., example="666666666666666666666666")

class DepartmentEdit(BaseModel):
    """
    Schema để SỬA department
    """
    id: str = Field(..., example="666666666666666666666666")
    name: str = Field(..., example="AI Center", min_length=1, max_length=100)


# ==================== Response Schemas ====================
class DepartmentCreateResponse(BaseModel):
    """
    Schema để TRẢ VỀ department mới
    """
    id: str = Field(..., example="666666666666666666666666")
    name: str = Field(..., example="AI Center", min_length=1, max_length=100)


class DepartmentDeleteResponse(BaseModel):
    """
    Schema để TRẢ VỀ department đã xóa
    """
    id: str = Field(..., example="666666666666666666666666")
    name: str = Field(..., example="AI Center", min_length=1, max_length=100)


class DepartmentEditResponse(BaseModel):
    """
    Schema để TRẢ VỀ department đã sửa
    """
    id: str = Field(..., example="666666666666666666666666")
    name: str = Field(..., example="AI Center", min_length=1, max_length=100)