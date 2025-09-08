from .base import BaseConfig

class FeatureConfig(BaseConfig):
    # Insightface config
    ENABLE_FACE_DETECTION: bool = True
    FACE_DETECTION_THRESHOLD: float = 0.5
    ENABLE_FACE_RECOGNITION: bool = True
    FACE_RECOGNITION_THRESHOLD: float = 0.005
    ENABLE_SHOW: bool = True
    LINE_THICKNESS: int = 3
    ENABLE_VERBOSE: bool = True

    # Media manager config
    SOURCE: str = "0"
    ENABLE_SAVE: bool = False

    # Data save config
    ENABLE_FACE_DATA_SAVE: bool = False
    FACE_DATA_SAVE_INTERVAL_SEC: int = 5  # seconds

features = FeatureConfig()