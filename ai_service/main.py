from config import features
from ai_service.insightface_detector import InsightFaceDetector
from ai_service.media_manager import MediaManager
from utils import LOGGER

media_manager = MediaManager(
    source=features.SOURCE,
    save=features.ENABLE_SAVE,
)

insightface_detector = InsightFaceDetector(
    face_detection=features.ENABLE_FACE_DETECTION,
    face_detection_threshold=features.FACE_DETECTION_THRESHOLD,
    face_recognition=features.ENABLE_FACE_RECOGNITION,
    face_recognition_threshold=features.FACE_RECOGNITION_THRESHOLD,
    show=features.ENABLE_SHOW,
    thickness=features.LINE_THICKNESS,
    verbose=features.ENABLE_VERBOSE,
    enable_face_data_save=features.ENABLE_FACE_DATA_SAVE,
    face_data_save_interval_sec=features.FACE_DATA_SAVE_INTERVAL_SEC,
    media_manager=media_manager
)

# Graceful shutdown on keyboard interrupt
try:
    insightface_detector.run_inference()
except KeyboardInterrupt:
    LOGGER.info("Received keyboard interrupt, shutting down...")
    insightface_detector.stop_threads()
    LOGGER.info("Shutdown complete.")