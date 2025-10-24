from pydantic import BaseModel, Field
from typing import Optional
from backend.utils.jwt import jwt_config

# ==================== Login API ====================
class LoginRequest(BaseModel):
    username_or_email: str = Field(..., example="quyetnn")
    password: str = Field(..., example="123456")
    remember_me: bool = Field(default=False, example=False)

class LoginResponse(BaseModel):
    access_token: str = Field(..., example="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...")
    refresh_token: Optional[str] = Field(  # 👈 cho phép None
        default=None,
        example="eyJhbGciOiJIUzI1NiIs...",  # có thể bỏ example nếu không luôn trả
    )
    token_type: str = Field(default="bearer", example="bearer")
    expires_in: Optional[int] = Field(
        default=jwt_config.JWT_ACCESS_TOKEN_EXPIRE_SECONDS,
        example=jwt_config.JWT_ACCESS_TOKEN_EXPIRE_SECONDS
    )


# ==================== Refresh Token API ====================
class RefreshRequest(BaseModel):
    refresh_token: str = Field(..., example="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...")

class RefreshResponse(BaseModel):
    access_token: str = Field(..., example="new_access_token_here")
    token_type: str = Field(default="bearer")
    expires_in: int = Field(
        default=jwt_config.JWT_ACCESS_TOKEN_EXPIRE_SECONDS,
        example=jwt_config.JWT_ACCESS_TOKEN_EXPIRE_SECONDS
    )


# ==================== Get me API ====================
class GetMeResponse(BaseModel):
    id: str = Field(..., example="user_id")
    username: str = Field(..., example="username")
    email: str = Field(..., example="email")
    full_name: str = Field(..., example="full_name")
    role: str = Field(..., example="role")
    position: str = Field(..., example="position")
    department: str = Field(..., example="department")
    telegram_username: Optional[str] = Field(default=None, example="telegram_username")