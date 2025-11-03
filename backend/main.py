# backend/main.py

from fastapi import FastAPI, Request, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from config.database import connect_to_mongodb, close_mongodb_connection, create_indexes
from backend.routes import user, auth, department, attendance, telegram
from backend.schemas.common import ApiError
from utils import LOGGER


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager
    - Code TRƯỚC yield: chạy khi startup
    - Code SAU yield: chạy khi shutdown
    """
    # ========== STARTUP ==========
    LOGGER.info("App đang khởi động...")
    await connect_to_mongodb()
    await create_indexes()
    LOGGER.info("App đã sẵn sàng!")
    
    yield  # ← App chạy ở đây
    
    # ========== SHUTDOWN ==========
    LOGGER.info("App đang tắt...")
    await close_mongodb_connection()
    LOGGER.info("Đã đóng kết nối!")


app = FastAPI(
    title="Edulive Face Recognition API",
    version="1.0.0",
    lifespan=lifespan,  # ← Truyền lifespan vào đây
    swagger_ui_parameters={
        "tryItOutEnabled": True,  # ← Bật mặc định nút "Try it out"
    },
)

# =========================================================
# CORS CONFIGURATION
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Cho phép tất cả origins (dev mode)
    # Trong production, nên chỉ định cụ thể: ["http://localhost:5173", "https://yourdomain.com"]
    allow_credentials=True,
    allow_methods=["*"],  # Cho phép tất cả HTTP methods (GET, POST, PUT, DELETE, OPTIONS...)
    allow_headers=["*"],  # Cho phép tất cả headers
)

# =========================================================
# GLOBAL EXCEPTION HANDLERS
# =========================================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Bắt tất cả lỗi HTTPException (do bạn raise thủ công)"""
    LOGGER.warning(f"[HTTP {exc.status_code}] {request.url} - {exc.detail}")
    payload = ApiError(
        message=str(exc.detail),
        error_code="HTTP_EXCEPTION",
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=payload.model_dump(),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Bắt lỗi validate body/query/path (422)"""
    LOGGER.warning(f"[VALIDATION] {request.url} - {exc.errors()}")
    payload = ApiError(
        message="Validation error",
        error_code="REQUEST_VALIDATION_ERROR",
        data={"errors": exc.errors()},
    )
    return JSONResponse(
        status_code=422,
        content=payload.model_dump(),
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Bắt tất cả lỗi không lường trước (500)"""
    LOGGER.exception(f"[UNHANDLED] {request.url} - {exc}")
    payload = ApiError(
        message="Internal Server Error",
        error_code="INTERNAL_ERROR",
    )
    return JSONResponse(
        status_code=500,
        content=payload.model_dump(),
    )

# =========================================================
# ROUTERS
# =========================================================

# Include routers
app.include_router(user.router)
app.include_router(auth.router)
app.include_router(department.router)
app.include_router(attendance.router)
app.include_router(telegram.router)