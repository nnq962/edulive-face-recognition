from pydantic import BaseModel, Field
from datetime import datetime
from bson import ObjectId
from typing import List


class Timestamp(BaseModel):
    time: datetime = Field(..., example="2025-10-01T10:53:02Z")
    camera_id: str = Field(..., example="CAM6")
    similarity: float = Field(..., example=0.95)


class AttendanceData(BaseModel):
    date: datetime = Field(..., example="2025-10-01T00:00:00Z")
    user_id: ObjectId = Field(..., example="69009a95f8f19decdd27172a")
    full_name: str = Field(..., example="Nguyễn Ngọc Quyết")
    check_in_time: datetime = Field(..., example="2025-10-01T08:12:00Z")
    check_out_time: datetime = Field(..., example="2025-10-01T17:35:00Z")
    timestamps: List[Timestamp] = Field(..., example=[
        {"time": "2025-10-29T10:43:22Z", "camera_id": "CAM6", "similarity": 0.95},
        {"time": "2025-10-29T10:43:22Z", "camera_id": "CAM6", "similarity": 0.95},
        {"time": "2025-10-29T10:43:22Z", "camera_id": "CAM6", "similarity": 0.95},
        ]
    )
    welcome_noti: bool = Field(..., example=True)
    goodbye_noti: bool = Field(..., example=True)
