from .base import BaseConfig

class FeatureConfig(BaseConfig):
    # Insightface config
    ENABLE_FACE_DETECTION: bool = True
    ENABLE_FACE_RECOGNITION: bool = False
    ENABLE_SHOW: bool = True
    LINE_THICKNESS: int = 3
    ENANLE_VERBOSE: bool = True

    # Media manager config
    SOURCE: str = "0"
    ENABLE_SAVE: bool = False

    # Data save config
    ENABLE_FACE_DATA_SAVE: bool = False
    FACE_DATA_SAVE_INTERVAL_SEC: int = 5  # seconds

features = FeatureConfig()