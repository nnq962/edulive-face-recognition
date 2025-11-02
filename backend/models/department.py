# backend/models/department.py

from pydantic import BaseModel, Field
from utils.time_helper import utc_now
from datetime import datetime

# ==================== Database Models ====================

class DepartmentModel(BaseModel):
    """
    Department model in database (MongoDB document)
    """
    # Department Info
    name: str = Field(..., example="AI Center", min_length=1, max_length=100)
    
    # Timestamps
    created_at: datetime = Field(default_factory=utc_now)