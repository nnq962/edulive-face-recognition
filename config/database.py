# config/database.py

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import Optional
from config.base import BaseConfig
from utils import LOGGER


class DatabaseConfig(BaseConfig):
    """
    MongoDB Configuration
    """
    MONGODB_USER: str
    MONGODB_PASSWORD: str
    MONGODB_HOST: str = "localhost"
    MONGODB_PORT: int = 27017
    MONGODB_NAME: str
    MONGODB_AUTHSOURCE: str = "admin"
    
    @property
    def MONGODB_URL(self) -> str:
        """
        Tạo MongoDB connection string với authentication
        """
        return (
            f"mongodb://{self.MONGODB_USER}:{self.MONGODB_PASSWORD}"
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


# Load config
db_config = DatabaseConfig()

# Global variables
mongodb_client: Optional[AsyncIOMotorClient] = None
mongodb_database: Optional[AsyncIOMotorDatabase] = None


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