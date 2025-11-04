from config.base import BaseConfig

class KeysConfig(BaseConfig):
    UPDATE_ATTENDANCE_API_KEY: str
    UPDATE_FAISS_API_KEY: str
    TELEGRAM_BOT_TOKEN: str
    SUPERVISOR_STATUS_API_KEY: str

keys_config = KeysConfig()