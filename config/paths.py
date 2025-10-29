"""
Module này cấu hình các đường dẫn, tự động tải xuống các model nếu chưa có.
"""

from pathlib import Path
import gdown
from config.base import BaseConfig
from utils import LOGGER


class PathConfig(BaseConfig):
    # Base paths
    ROOT_DIR: Path = Path(__file__).resolve().parent.parent
    AI_SERVICE_DIR: Path = ROOT_DIR / "ai_service"
    MODEL_DIR: Path = AI_SERVICE_DIR / "ai_models"
    DATA_DIR: Path = AI_SERVICE_DIR / "data"
    FAISS_DIR: Path = DATA_DIR / "faiss"
    
    # Model URLs
    MODEL_RETINAFACE_URL: str
    MODEL_ARCFACE_URL: str

    # Model paths
    DET_MODEL_PATH: str = str(MODEL_DIR / "retinaface.onnx")
    REC_MODEL_PATH: str = str(MODEL_DIR / "arcface.onnx")
    FAISS_FILE_PATH: str = str(FAISS_DIR / "face_index.faiss")
    FAISS_MAPPING_FILE_PATH: str = str(FAISS_DIR / "faiss_mapping.pkl")

    # Backend paths
    USERS_DATA_PATH: str
    USERS_DATA_DIR: Path | None = None

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

        # Chuẩn hoá USERS_DATA_PATH thành Path tuyệt đối
        raw_path = Path(self.USERS_DATA_PATH)
        if not raw_path.is_absolute():
            self.USERS_DATA_DIR = (self.ROOT_DIR / raw_path).resolve()
        else:
            self.USERS_DATA_DIR = raw_path.resolve()

        # Map model URLs để tiện download
        self._model_map = {
            "retinaface.onnx": self.MODEL_RETINAFACE_URL,
            "arcface.onnx": self.MODEL_ARCFACE_URL,
        }

        # Tạo thư mục cần thiết
        self.ensure_directories()

        # Kiểm tra model, tải nếu chưa có
        self.ensure_models()

    def ensure_directories(self):
        """Tạo thư mục cần thiết nếu chưa có"""
        for path in [self.MODEL_DIR, self.FAISS_DIR, self.USERS_DATA_DIR]:
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