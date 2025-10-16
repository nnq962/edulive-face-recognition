"""
Module này cấu hình các đường dẫn, tự động tải xuống các model nếu chưa có.
"""

from pathlib import Path
import gdown
from .base import BaseConfig
from utils.logger import LOGGER


class PathConfig(BaseConfig):
    # Base paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    MODEL_DIR: Path = BASE_DIR / "models"
    DATA_DIR: Path = BASE_DIR / "data"
    FAISS_DIR: Path = DATA_DIR / "faiss"
    FAISS_TEST_DIR: Path = DATA_DIR / "faiss" / "test"
    FAISS_PRODUCTION_DIR: Path = DATA_DIR / "faiss" / "production"
    
    # Model URLs
    MODEL_RETINAFACE_URL: str
    MODEL_ARCFACE_URL: str

    # Model paths
    DET_MODEL_PATH: str = str(MODEL_DIR / "retinaface.onnx")
    REC_MODEL_PATH: str = str(MODEL_DIR / "arcface.onnx")
    FAISS_FILE_PATH: str = str(FAISS_PRODUCTION_DIR / "face_index.faiss")
    FAISS_MAPPING_FILE_PATH: str = str(FAISS_PRODUCTION_DIR / "faiss_mapping.pkl")
    FAISS_TEST_FILE_PATH: str = str(FAISS_TEST_DIR / "face_index.faiss")
    FAISS_TEST_MAPPING_FILE_PATH: str = str(FAISS_TEST_DIR / "faiss_mapping.pkl")

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

        self._model_map = {
            "retinaface.onnx": self.MODEL_RETINAFACE_URL,
            "arcface.onnx": self.MODEL_ARCFACE_URL,
        }

        self.ensure_directories()
        self.ensure_models()

    def ensure_directories(self):
        """Tạo thư mục cần thiết nếu chưa có"""
        for path in [self.MODEL_DIR, self.FAISS_DIR]:
            if not path.exists():
                path.mkdir(parents=True, exist_ok=True)
                LOGGER.info(f"Created directory: {path}")

    def ensure_models(self):
        """Tải model từ Google Drive nếu chưa có"""
        for filename, url in self._model_map.items():
            target = self.MODEL_DIR / filename
            if not target.exists():
                LOGGER.warning(f"Downloading model: {filename}")
                try:
                    gdown.download(url, str(target), quiet=False)
                    size_mb = round(target.stat().st_size / (1024 * 1024), 2)
                    LOGGER.info(f"Saved {filename} ({size_mb} MB) to {target}")
                except Exception as e:
                    LOGGER.error(f"Failed to download {filename}: {e}")


paths = PathConfig()