from datetime import datetime, date as DateType
from pydantic import BaseModel, Field, field_serializer
from typing import List, Optional

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


class MonthlyAttendanceReport(BaseModel):
    data: List[UserMonthlyAttendance] = Field(
        ..., example=[{"user_id": "69009a95f8f19decdd27172a", "full_name": "Nguyễn Ngọc Quyết", "attendances": [{"date": "2025-10-01T00:00:00Z", "check_in_time": "2025-10-01T08:15:00Z", "check_out_time": "2025-10-01T17:05:00Z"}]}]
    )