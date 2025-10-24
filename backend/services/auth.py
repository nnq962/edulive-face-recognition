from backend.utils.password import verify_password
from backend.utils.jwt import decode_token, create_access_token
from utils import LOGGER
from backend.utils.jwt import jwt_config
from datetime import timedelta
from fastapi import HTTPException, status

async def authenticate_user(db, username_or_email: str, password: str):
    user = await db["users"].find_one({
        "$or": [
            {"username": username_or_email},
            {"email": username_or_email},
        ]
    })
    if not user:
        return None
    if not verify_password(password, user["password"]):
        return None
    return user


async def refresh_access_token(refresh_token: str) -> str:
    try:
        # decode_token() sẽ tự raise HTTPException(401) nếu token lỗi
        payload = decode_token(refresh_token)

        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload"
            )

        new_access_token = create_access_token(
            user_id=user_id,
            expires_delta=timedelta(minutes=jwt_config.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        return new_access_token

    except HTTPException as e:
        # ⚠️ Đừng raise lại lỗi khác, cứ để nó đi thẳng ra route
        raise e

    except Exception as e:
        LOGGER.error(f"Unexpected error in refresh_access_token: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )