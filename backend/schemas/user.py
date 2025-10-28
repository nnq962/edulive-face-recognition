# backend/schemas/user.py

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal, List

# ==================== Request Schemas ====================
class UserCreate(BaseModel):
    """
    Schema để TẠO user mới
    """
    # Personal Info
    full_name: str = Field(..., example="Nguyễn Ngọc Quyết", min_length=1, max_length=100)
    
    # Organization Info
    role: Literal["user", "admin", "super_admin"] = Field(..., example="user")
    position: str = Field(..., example="Developer", min_length=1, max_length=100)
    department: str = Field(..., example="AI Center", min_length=1, max_length=100)
    
    # Contact (Optional khi tạo)
    telegram_username: Optional[str] = Field(default=None, example="quyetnn", max_length=50)


class UserUpdate(BaseModel):
    """
    Schema để CẬP NHẬT user
    """
    full_name: Optional[str] = Field(default=None, example="Nguyễn Ngọc Quyết", min_length=1, max_length=100)
    email: Optional[EmailStr] = Field(default=None, example="quyetnn@edulive.net")
    role: Optional[Literal["user", "admin", "super_admin"]] = Field(default=None, example="user")
    position: Optional[str] = Field(default=None, example="Developer", min_length=1, max_length=100)
    department: Optional[str] = Field(default=None, example="AI Center", min_length=1, max_length=100)
    telegram_username: Optional[str] = Field(default=None, example="quyetnn", max_length=50)
    is_active: Optional[bool] = Field(default=None, example=True)


# ==================== Response Schemas ====================
class UserCreateResponse(BaseModel):
    """
    Schema để TRẢ VỀ user mới
    """
    id: str = Field(..., example="666666666666666666666666")
    username: str = Field(..., example="quyetnn")
    email: str = Field(..., example="quyetnn@edulive.net")
    full_name: str = Field(..., example="Nguyễn Ngọc Quyết")
    role: Literal["user", "admin", "super_admin"] = Field(..., example="user")
    position: str = Field(..., example="Developer")
    department: str = Field(..., example="AI Center")
    data_directory: str = Field(..., example="/data/users/666666666666666666666666")
    photos_path: List[str] = Field(default_factory=list, example=["/data/users/666666666666666666666666/photos/photo1.jpg", "/data/users/666666666666666666666666/photos/photo2.jpg"])
    telegram_username: Optional[str] = Field(default=None, example="quyetnn")
    is_active: bool = Field(..., example=True)


class UserUpdateResponse(BaseModel):
    """
    Schema để TRẢ VỀ user đã cập nhật
    """
    id: str = Field(..., example="666666666666666666666666")
    username: str = Field(..., example="quyetnn")
    email: str = Field(..., example="quyetnn@edulive.net")
    full_name: str = Field(..., example="Nguyễn Ngọc Quyết")
    role: Literal["user", "admin", "super_admin"] = Field(..., example="user")
    position: str = Field(..., example="Developer")
    department: str = Field(..., example="AI Center")
    telegram_username: Optional[str] = Field(default=None, example="quyetnn")
    is_active: bool = Field(..., example=True)


class PhotoUploadResponse(BaseModel):
    success: bool
    message: str
    photo_url: Optional[str] = None