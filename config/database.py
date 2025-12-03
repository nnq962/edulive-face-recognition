# config/database.py

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import Optional
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from config.base import BaseConfig
from utils import LOGGER
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker, AsyncEngine
from sqlalchemy import text
from urllib.parse import quote_plus


class DatabaseConfig(BaseConfig):
    """
    Database Configuration (MongoDB & MySQL)
    """
    # MongoDB Configuration
    MONGODB_USER: str
    MONGODB_PASSWORD: str
    MONGODB_HOST: str = "localhost"
    MONGODB_PORT: int = 27017
    MONGODB_NAME: str
    MONGODB_AUTHSOURCE: str = "admin"
    
    # MySQL Configuration
    MYSQL_USER: str
    MYSQL_PASSWORD: str
    MYSQL_HOST: str = "localhost"
    MYSQL_PORT: int = 3306
    MYSQL_DATABASE: str
    
    @property
    def MONGODB_URL(self) -> str:
        """
        Tạo MongoDB connection string với authentication
        URL encode username và password để xử lý ký tự đặc biệt như @, :, /, etc.
        """
        encoded_user = quote_plus(self.MONGODB_USER)
        encoded_password = quote_plus(self.MONGODB_PASSWORD)
        return (
            f"mongodb://{encoded_user}:{encoded_password}"
            f"@{self.MONGODB_HOST}:{self.MONGODB_PORT}"
            f"/?authSource={self.MONGODB_AUTHSOURCE}"
        )
    
    @property
    def MONGODB_URL_SAFE(self) -> str:
        """
        MongoDB URL để log (ẩn password)
        """
        return (
            f"mongodb://{self.MONGODB_USER}:****"
            f"@{self.MONGODB_HOST}:{self.MONGODB_PORT}"
            f"/?authSource={self.MONGODB_AUTHSOURCE}"
        )
    
    @property
    def MYSQL_URL(self) -> str:
        """
        Tạo MySQL connection string với authentication
        URL encode username và password để xử lý ký tự đặc biệt như @, :, /, etc.
        """
        encoded_user = quote_plus(self.MYSQL_USER)
        encoded_password = quote_plus(self.MYSQL_PASSWORD)
        return (
            f"mysql+aiomysql://{encoded_user}:{encoded_password}"
            f"@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DATABASE}"
        )
    
    @property
    def MYSQL_URL_SAFE(self) -> str:
        """
        MySQL URL để log (ẩn password)
        """
        return (
            f"mysql+aiomysql://{self.MYSQL_USER}:****"
            f"@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DATABASE}"
        )


# Load config
db_config = DatabaseConfig()

# Global variables
mongodb_client: Optional[AsyncIOMotorClient] = None
mongodb_database: Optional[AsyncIOMotorDatabase] = None

# MySQL global variables
mysql_engine: Optional[AsyncEngine] = None
mysql_sessionmaker: Optional[async_sessionmaker[AsyncSession]] = None


async def connect_to_mongodb() -> None:
    """
    Kết nối đến MongoDB
    
    Raises:
        Exception: Nếu không thể kết nối đến MongoDB
    """
    global mongodb_client, mongodb_database
    
    try:
        LOGGER.info(f"Đang kết nối đến MongoDB: {db_config.MONGODB_URL_SAFE}")
        
        # Tạo MongoDB client
        mongodb_client = AsyncIOMotorClient(
            db_config.MONGODB_URL,
            maxPoolSize=10,
            minPoolSize=1,
            serverSelectionTimeoutMS=5000
        )
        
        # Chọn database
        mongodb_database = mongodb_client[db_config.MONGODB_NAME]
        
        # Test connection
        await mongodb_client.admin.command('ping')
        
        LOGGER.info(f"Kết nối MongoDB thành công! Database: {db_config.MONGODB_NAME}")
        
    except Exception as e:
        LOGGER.error(f"Không thể kết nối đến MongoDB: {e}")
        raise Exception(f"MongoDB connection failed: {e}")


async def close_mongodb_connection() -> None:
    """
    Đóng kết nối MongoDB
    """
    global mongodb_client
    
    if mongodb_client:
        mongodb_client.close()
        LOGGER.info("Đã đóng kết nối MongoDB")


def get_database() -> AsyncIOMotorDatabase:
    """
    Lấy database instance
    
    Returns:
        AsyncIOMotorDatabase: MongoDB database instance
        
    Raises:
        Exception: Nếu database chưa được khởi tạo
    """
    if mongodb_database is None:
        LOGGER.error("Database chưa được khởi tạo. Hãy gọi connect_to_mongodb() trước.")
        raise Exception("Database not initialized. Call connect_to_mongodb() first.")
    
    return mongodb_database


async def create_indexes() -> None:
    """
    Tạo indexes cho các collections
    """
    try:
        db = get_database()
        
        LOGGER.info("Đang tạo indexes...")
        
        # Users collection indexes
        # await db.users.create_index("username", unique=True)
        # LOGGER.info("Đã tạo index: users.username (unique)")

        # await db.faces.create_index("user_id")
        # LOGGER.info("Đã tạo index: faces.user_id")
        
        LOGGER.info("Hoàn thành tạo indexes!")
        
    except Exception as e:
        LOGGER.error(f"Lỗi khi tạo indexes: {e}")
        raise


async def ping_database() -> bool:
    """
    Kiểm tra kết nối database còn sống không
    
    Returns:
        bool: True nếu kết nối OK, False nếu lỗi
    """
    try:
        if mongodb_client:
            await mongodb_client.admin.command('ping')
            return True
        return False
    except Exception as e:
        LOGGER.error(f"Ping database failed: {e}")
        return False


def get_collection(collection_name: str):
    """
    Lấy collection theo tên
    
    Args:
        collection_name: Tên collection
        
    Returns:
        AsyncIOMotorCollection: Collection instance
    """
    db = get_database()
    return db[collection_name]


# =========================================================
# MYSQL CONNECTION FUNCTIONS
# =========================================================

async def connect_to_mysql() -> None:
    """
    Kết nối đến MySQL
    
    Raises:
        Exception: Nếu không thể kết nối đến MySQL
    """
    global mysql_engine, mysql_sessionmaker
    
    try:
        LOGGER.info(f"Đang kết nối đến MySQL: {db_config.MYSQL_URL_SAFE}")
        
        # Tạo MySQL async engine
        mysql_engine = create_async_engine(
            db_config.MYSQL_URL,
            pool_size=10,
            max_overflow=20,
            pool_pre_ping=True,  # Kiểm tra connection trước khi sử dụng
            echo=False  # Set True để log SQL queries (debug mode)
        )
        
        # Tạo sessionmaker
        mysql_sessionmaker = async_sessionmaker(
            mysql_engine,
            class_=AsyncSession,
            expire_on_commit=False
        )
        
        # Test connection
        async with mysql_engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        
        LOGGER.info(f"Kết nối MySQL thành công! Database: {db_config.MYSQL_DATABASE}")
        
    except Exception as e:
        LOGGER.error(f"Không thể kết nối đến MySQL: {e}")
        raise Exception(f"MySQL connection failed: {e}")


async def close_mysql_connection() -> None:
    """
    Đóng kết nối MySQL
    """
    global mysql_engine
    
    if mysql_engine:
        await mysql_engine.dispose()
        LOGGER.info("Đã đóng kết nối MySQL")


@asynccontextmanager
async def get_mysql_session() -> AsyncIterator[AsyncSession]:
    """
    Cung cấp MySQL async session theo dạng context manager
    
    Usage:
        async with get_mysql_session() as session:
            await session.execute(...)
            await session.commit()
    
    Raises:
        Exception: Nếu MySQL chưa được khởi tạo
    """
    if mysql_sessionmaker is None:
        LOGGER.error("MySQL chưa được khởi tạo. Hãy gọi connect_to_mysql() trước.")
        raise Exception("MySQL not initialized. Call connect_to_mysql() first.")
    
    session = mysql_sessionmaker()
    try:
        yield session
    finally:
        await session.close()