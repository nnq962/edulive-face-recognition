from config.base import BaseConfig

class NetworkConfig(BaseConfig):
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    ALLOW_CORS: bool = True

network = NetworkConfig()