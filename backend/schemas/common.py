# backend/schemas/common.py

from typing import Generic, Optional, TypeVar, Any, Dict
from pydantic.generics import GenericModel
from pydantic import BaseModel


T = TypeVar("T")

class ApiResponse(GenericModel, Generic[T]):
    success: bool
    message: str
    data: Optional[T] = None

class ApiResponseWithMeta(ApiResponse[T], Generic[T]):
    meta: Dict[str, Any]

class ApiError(BaseModel):
    success: bool = False
    message: str
    error_code: Optional[str] = None
    data: Optional[Dict[str, Any]] = None  # giữ cùng "shape" cho dễ parse FE