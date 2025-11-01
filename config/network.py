from config.base import BaseConfig

class NetworkConfig(BaseConfig):
    ATTENDANCE_API_URL: str
    NOTIFICATION_API_URL: str

network = NetworkConfig()