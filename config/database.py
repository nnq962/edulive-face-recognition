from .base import BaseConfig

class DatabaseConfig(BaseConfig):
    DB_URI: str = "sqlite:///data/app.db"
    DB_POOL_SIZE: int = 5
    DB_ECHO: bool = False

database = DatabaseConfig()