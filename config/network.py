from config.base import BaseConfig

class NetworkConfig(BaseConfig):
    UPDATE_ATTENDANCE_API_URL: str
    UPDATE_FAISS_API_URL: str

network = NetworkConfig()