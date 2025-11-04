from config.base import BaseConfig

class FeatureConfig(BaseConfig):
    # Insightface config
    ENABLE_FACE_DETECTION: bool = True
    FACE_DETECTION_THRESHOLD: float = 0.7
    ENABLE_FACE_RECOGNITION: bool = True
    FACE_RECOGNITION_THRESHOLD: float = 0.54
    ENABLE_SHOW: bool = True
    LINE_THICKNESS: int = 3
    ENABLE_VERBOSE: bool = False

    # Media manager config
    SOURCE: str = "ai_service/device.txt"
    ENABLE_SAVE: bool = False

    # Data save config
    ENABLE_FACE_DATA_SAVE: bool = True
    FACE_DATA_SAVE_INTERVAL_SEC: int = 1
    SEND_NOTIFICATION: bool = False

features = FeatureConfig()