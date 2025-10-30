# backend/utils/permissions.py

from fastapi import HTTPException, status

from fastapi import HTTPException, status

ROLE_HIERARCHY = {
    "super_admin": ["super_admin", "admin", "user"],
    "admin": ["admin", "user"],
    "user": [],
}

ROLE_DISPLAY_NAME = {
    "super_admin": "Super Admin",
    "admin": "Admin",
    "user": "User",
}

def ensure_can_manage(requester_role: str, target_role: str, action: str = "manage"):
    """
    Kiểm tra xem requester có quyền thao tác (tạo/sửa/xoá/...) lên target_role không.
    """
    allowed_targets = ROLE_HIERARCHY.get(requester_role, [])
    if target_role not in allowed_targets:
        requester_name = ROLE_DISPLAY_NAME.get(requester_role, requester_role.title())
        target_name = ROLE_DISPLAY_NAME.get(target_role, target_role.title())
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Forbidden: {requester_name} cannot {action} {target_name} accounts",
        )