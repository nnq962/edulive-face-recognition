# backend/models/user.py

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Literal
from utils.time_helper import utc_now
from datetime import datetime

# ==================== Database Models ====================

class UserModel(BaseModel):
    """
    User model trong database (MongoDB document)
    """    
    # Authentication
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str
    
    # Personal Info
    full_name: str = Field(..., min_length=1, max_length=100)
    
    # Organization Info
    role: Literal["user", "admin", "super_admin"] = Field(...)
    position: str = Field(..., min_length=1, max_length=100)
    department: str = Field(..., min_length=1, max_length=100)
    
    # Contact
    telegram_username: Optional[str] = Field(default=None, max_length=50)
    telegram_chat_id: Optional[str] = Field(default=None, max_length=50)
    
    # Status
    is_active: bool = Field(default=True)
    
    # Additional
    photo_directory: Optional[str] = Field(default=None)
    face_embeddings: Optional[List[float]] = Field(default=None)
    
    # Timestamps
    created_at: datetime = Field(default_factory=utc_now)