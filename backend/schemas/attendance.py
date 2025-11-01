from datetime import datetime, date as DateType
from pydantic import BaseModel, Field, field_serializer
from typing import List, Optional, Literal

class TimestampSchema(BaseModel):
    time: datetime = Field(..., example="2025-10-01T10:53:02Z")
    camera_id: str = Field(..., example="CAM6")
    
    @field_serializer('time')
    def serialize_time(self, dt: datetime, _info):
        """Serialize datetime to ISO format with Z suffix"""
        if dt:
            return dt.strftime('%Y-%m-%dT%H:%M:%SZ')
        return None

class AttendanceResponse(BaseModel):
    id: str = Field(..., example="69009a95f8f19decdd27172a")
    full_name: str = Field(..., example="Nguyễn Ngọc Quyết")
    date: datetime = Field(..., example="2025-10-01T00:00:00Z")
    check_in_time: datetime = Field(..., example="2025-10-01T00:52:54Z")
    check_out_time: datetime = Field(..., example="2025-10-01T10:53:02Z")
    last_timestamp: TimestampSchema = Field(
        ..., example={"time": "2025-10-01T10:53:02Z", "camera_id": "CAM6"}
    )
    
    @field_serializer('date', 'check_in_time', 'check_out_time')
    def serialize_datetime(self, dt: datetime, _info):
        """Serialize datetime to ISO format with Z suffix"""
        if dt:
            return dt.strftime('%Y-%m-%dT%H:%M:%SZ')
        return None


class DailyAttendance(BaseModel):
    date: DateType = Field(..., description="Ngày chấm công")
    check_in_time: Optional[datetime] = Field(
        None,
        description="Thời điểm check in",
        example="2025-10-01T08:15:00Z"
    )
    check_out_time: Optional[datetime] = Field(
        None,
        description="Thời điểm check out",
        example="2025-10-01T17:05:00Z"
    )
    
    @field_serializer('date')
    def serialize_date(self, dt: DateType, _info):
        """Serialize date to ISO format"""
        if dt:
            return dt.isoformat()
        return None
    
    @field_serializer('check_in_time', 'check_out_time')
    def serialize_datetime(self, dt: datetime, _info):
        """Serialize datetime to ISO format with Z suffix"""
        if dt:
            return dt.strftime('%Y-%m-%dT%H:%M:%SZ')
        return None


class UserMonthlyAttendance(BaseModel):
    user_id: str = Field(..., example="69009a95f8f19decdd27172a")
    full_name: str = Field(..., example="Nguyễn Ngọc Quyết")
    attendances: List[DailyAttendance] = Field(
        ..., example=[{"date": "2025-10-01T00:00:00Z", "check_in_time": "2025-10-01T08:15:00Z", "check_out_time": "2025-10-01T17:05:00Z"}]
    )


# ==================== Schemas for Detection API ====================

class DetectionItem(BaseModel):
    """Một detection item từ client"""
    user_id: str = Field(..., example="69009a95f8f19decdd27172a")
    camera_id: str = Field(..., example="CAM6")
    similarity: float = Field(..., ge=0.0, le=1.0, example=0.95)


class AttendanceDetectionRequest(BaseModel):
    """Request từ client gửi lên với batch detections"""
    timestamp: datetime = Field(..., example="2025-10-31T10:43:22Z")
    data: List[DetectionItem] = Field(..., min_items=1)


class AttendanceActionResult(BaseModel):
    """Kết quả xử lý cho một user"""
    user_id: str = Field(..., example="69009a95f8f19decdd27172a")
    full_name: str = Field(..., example="Nguyễn Ngọc Quyết")
    action: Literal["check_in", "check_out", "timestamp_added", "after_hours_only"] = Field(
        ...,
        example="check_in",
        description="check_in: Check-in đầu tiên | check_out: Check-out sau 17h30 | timestamp_added: Chỉ thêm timestamp | after_hours_only: Sau 17h30 chỉ check-out"
    )
    show_welcome: bool = Field(..., example=True)
    show_goodbye: bool = Field(..., example=False)
    message: Optional[str] = Field(None, example="Chào mừng Quyết đến công ty!")


class AttendanceDetectionResponse(BaseModel):
    """Response trả về cho client"""
    success: bool = Field(default=True)
    message: str = Field(default="Detection processed successfully")
    results: List[AttendanceActionResult]
