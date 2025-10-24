# backend/utils/permissions.py

from fastapi import HTTPException, status

# Ma trận quyền (Role Hierarchy)
ROLE_HIERARCHY = {
    "super_admin": ["super_admin", "admin", "user"],
    "admin": ["admin", "user"],
    "user": [],
}

def ensure_can_manage(requester_role: str, target_role: str, action: str = "manage"):
    """
    Kiểm tra xem requester có quyền thao tác (tạo/sửa/xoá/...) lên target_role không.
    """
    allowed_targets = ROLE_HIERARCHY.get(requester_role, [])

    if target_role not in allowed_targets:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Forbidden: {requester_role} cannot {action} {target_role} accounts",
        )