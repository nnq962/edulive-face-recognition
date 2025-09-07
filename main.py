from config import features
from insightface_detector import InsightFaceDetector
from media_manager import MediaManager
from utils import LOGGER

media_manager = MediaManager(
    source=features.SOURCE,
    save=features.ENABLE_SAVE,
)

insightface_detector = InsightFaceDetector(
    face_detection=features.ENABLE_FACE_DETECTION,
    face_recognition=features.ENABLE_FACE_RECOGNITION,
    show=features.ENABLE_SHOW,
    thickness=features.LINE_THICKNESS,
    verbose=features.ENANLE_VERBOSE,
    media_manager=media_manager
)

# Graceful shutdown on keyboard interrupt
try:
    insightface_detector.run_inference()
except KeyboardInterrupt:
    LOGGER.info("Received keyboard interrupt, shutting down...")
    insightface_detector.stop_threads()
    LOGGER.info("Shutdown complete.")