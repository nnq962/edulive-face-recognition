from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    MONGODB_USER: str
    MONGODB_PASSWORD: str
    MONGODB_HOST: str = "localhost"
    MONGODB_PORT: int = 27017
    MONGODB_NAME: str
    MONGODB_AUTHSOURCE: str = "admin"

    @property
    def MONGODB_URI(self) -> str:
        return (
            f"mongodb://{self.MONGODB_USER}:{self.MONGODB_PASSWORD}"
            f"@{self.MONGODB_HOST}:{self.MONGODB_PORT}/{self.MONGODB_NAME}"
            f"?authSource={self.MONGODB_AUTHSOURCE}"
        )

    class Config:
        env_file = ".env"

settings = Settings()