# backend/schemas/user.py

from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List, Literal
from datetime import datetime
from bson import ObjectId
from utils.time_helper import utc_now


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
    telegram_username: Optional[str] = Field(default=None, example="quyetnn")
    is_active: bool = Field(..., example=True)