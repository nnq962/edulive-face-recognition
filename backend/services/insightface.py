from ai_service.insightface_detector import InsightFaceDetector
import cv2

detector = InsightFaceDetector(
    face_detection=True,
    face_detection_threshold=0.65,
    face_recognition=False
)

def get_num_faces(image_path: str):
    image = cv2.imread(image_path)
    detection_results, detection_time = detector.detect_faces(image)
    bboxes, _ = detection_results[0]
    num_faces = bboxes.shape[0]
    return num_faces, detection_time