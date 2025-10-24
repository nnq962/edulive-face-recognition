# backend/utils/filters.py

from typing import Optional, Literal
from pydantic import BaseModel, Field


class UserFilterParams(BaseModel):
    """Query parameters để lọc users"""
    
    # Filter by ID
    id: Optional[str] = Field(None, description="Lọc theo user ID")
    
    # Filter by role
    role: Optional[Literal["user", "admin", "super_admin"]] = Field(
        None, 
        description="Lọc theo role (user, admin, super_admin)"
    )
    
    # Filter by position
    position: Optional[str] = Field(None, description="Lọc theo chức vụ")
    
    # Filter by department
    department: Optional[str] = Field(None, description="Lọc theo phòng ban")
    
    # Filter by status
    is_active: Optional[bool] = Field(None, description="Lọc theo trạng thái (true=active, false=inactive)")
    
    # Search (tìm kiếm trong username, email, full_name)
    search: Optional[str] = Field(None, description="Tìm kiếm trong username, email, full_name")
    
    def build_query(self) -> dict:
        """
        Build MongoDB query từ filter parameters
        
        Returns:
            dict: MongoDB query object
        """
        query = {}
        
        # Filter by ID
        if self.id:
            query["_id"] = self.id
        
        # Filter by role
        if self.role:
            query["role"] = self.role
        
        # Filter by position
        if self.position:
            query["position"] = {"$regex": self.position, "$options": "i"}  # Case-insensitive
        
        # Filter by department
        if self.department:
            query["department"] = {"$regex": self.department, "$options": "i"}
        
        # Filter by is_active
        if self.is_active is not None:
            query["is_active"] = self.is_active
        
        # Search trong username, email, full_name
        if self.search:
            query["$or"] = [
                {"username": {"$regex": self.search, "$options": "i"}},
                {"email": {"$regex": self.search, "$options": "i"}},
                {"full_name": {"$regex": self.search, "$options": "i"}},
            ]
        
        return query
