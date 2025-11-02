import platform
import queue
import threading
import time
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Tuple

import cv2
import numpy as np
import onnxruntime as ort
import requests
from insightface.model_zoo import model_zoo

from ai_service.utils.insightface_utils import (
    FaceRecognitionResult,
    crop_and_align_faces,
    crop_image,
    normalize_embeddings,
    search_ids,
)
from ai_service.utils.plots import Annotator
from config import network, paths, keys
from utils import LOGGER
from utils.time_helper import utc_now_iso

ort.set_default_logger_severity(3)

UPDATE_ATTENDANCE_API_URL = network.UPDATE_ATTENDANCE_API_URL
UPDATE_ATTENDANCE_API_KEY = keys.UPDATE_ATTENDANCE_API_KEY


@dataclass
class DetectionBatchResult:
    """
    Kết quả detection
        results_per_source: Danh sách kết quả detection cho mỗi camera
        frames: Danh sách frames gốc
        source_ids: Danh sách ID của các camera
        timestamp: Thời gian tạo kết quả
        frame_id: ID của frame
        processing_time: Thời gian xử lý kết quả
    """
    results_per_source: List[Tuple[np.ndarray, np.ndarray]]  # [(bboxes, keypoints)]
    frames: List[np.ndarray]
    source_ids: List[int]
    timestamp: float
    frame_id: int
    processing_time: float


@dataclass
class RecognitionBatchResult:
    """
    Kết quả nhận diện khuôn mặt.
        results_per_source: Danh sách kết quả recognition cho mỗi camera.
        bboxes_per_source: Danh sách bounding boxes cho mỗi camera.
        source_ids: Danh sách ID của các camera.
        timestamp: Thời gian tạo kết quả.
        frame_id: ID của frame.
        processing_time: Thời gian xử lý kết quả.
    """
    results_per_source: List[List[Optional[FaceRecognitionResult]]]
    bboxes_per_source: List[Tuple[np.ndarray, np.ndarray]]
    source_ids: List[int]
    timestamp: float
    frame_id: int
    processing_time: float
    
    def to_api_payload(self) -> dict:
        """
        Convert sang format API để gửi lên backend.
        
        Returns:
            dict: Payload theo format API
        """
        data = []
        
        for source_idx, results in enumerate(self.results_per_source):
            source_id = self.source_ids[source_idx]
            camera_id = f"CAM_{source_id}"
            
            for result in results:
                if result is not None:  # Bỏ qua None
                    data.append({
                        "user_id": result.user_id,
                        "camera_id": camera_id,
                        "similarity": result.similarity
                    })

        return {
            "timestamp": utc_now_iso(),
            "data": data
        }


class ThreadedInferenceState:
    """Quản lý state cho threaded inference"""
    def __init__(self):
        # Cache kết quả gần nhất (detection + recognition cùng frame)
        self.cached_result: Optional[RecognitionBatchResult] = None
        self.pipeline_busy = threading.Lock()  # Lock cho toàn bộ pipeline
        self.frame_counter = 0
        self.running = False
        
        # Queues cho sequential pipeline
        self.detection_input_queue = queue.Queue(maxsize=1)
        self.detection_output_queue = queue.Queue(maxsize=1)
        self.recognition_input_queue = queue.Queue(maxsize=1)
        self.recognition_output_queue = queue.Queue(maxsize=1)
        
        # API sender queue và state
        self.api_queue = queue.Queue(maxsize=10)  # Queue cho API requests
        self.last_api_send_time = 0  # Timestamp của lần gửi cuối
        

class InsightFaceDetector:
    """
    Face detector using InsightFace with sequential pipeline
    """
    def __init__(
        self,
        face_detection=True,
        face_detection_threshold=0.5,
        face_recognition=False,
        face_recognition_threshold=0.5,
        show=False,
        thickness=3,
        verbose=False,
        media_manager=None,
        enable_face_data_save=False,
        face_data_save_interval_sec=2,

    ):
        self.face_detection = face_detection
        self.face_detection_threshold = face_detection_threshold
        self.face_recognition = face_recognition
        self.face_recognition_threshold = face_recognition_threshold
        self.enable_face_data_save = enable_face_data_save
        self.face_data_save_interval_sec = face_data_save_interval_sec
        if self.face_recognition is True and self.face_detection is False:
            raise ValueError("Face recognition requires face detection")

        self.show = show
        self.line_thickness = thickness
        self.verbose = verbose

        # Media manager
        self.media_manager = media_manager
        if self.media_manager is not None:
            self.source_ids = self.media_manager.source_ids
            self.webcam = self.media_manager.webcam
            self.dataset = self.media_manager.dataset
            self.vid_path = self.media_manager.vid_path
            self.vid_writer = self.media_manager.vid_writer
            self.save_dir = self.media_manager.save_dir
            self.save = self.media_manager.save
            self.save_crop = self.media_manager.save_crop
            self.needs_rendering = self.show or self.save or self.save_crop
        else:
            LOGGER.warning("Media manager is not provided, using default values")

        # Models
        self.det_model = None
        self.rec_model = None
        self.load_model()
        
        # Threading components
        self.state = ThreadedInferenceState()
        self.detection_thread = None
        self.recognition_thread = None
        self.api_sender_thread = None

    def load_model(self):
        """Load detection and recognition models"""
        if self.face_detection:
            try:
                # Load detection model
                LOGGER.info(f"Loading detection model: {paths.DET_MODEL_PATH}")
                self.det_model = model_zoo.get_model(paths.DET_MODEL_PATH)
                self.det_model.prepare(ctx_id=0, input_size=(640, 640))
                LOGGER.info("Detection model loaded successfully.")
            except Exception as e:
                LOGGER.error(f"Failed to load detection model: {e}")
                self.det_model = None

        if self.face_recognition:
            try:
                # Load recognition model
                LOGGER.info(f"Loading recognition model: {paths.REC_MODEL_PATH}")
                self.rec_model = model_zoo.get_model(paths.REC_MODEL_PATH)
                self.rec_model.prepare(ctx_id=0)
                LOGGER.info("Recognition model loaded successfully.")
            except Exception as e:
                LOGGER.error(f"Failed to load recognition model: {e}")
                self.rec_model = None

    def detect_faces(self, imgs):
        """
        Detect faces for multiple images (batch processing).
        
        Args:
            imgs: List of images or single image
            
        Returns:
            tuple: (detection_results, processing_time)
                - detection_results: List of (bboxes, keypoints) for each image
                - processing_time: Time taken for detection in seconds
        """
        if not isinstance(imgs, list):
            imgs = [imgs]

        start_time = time.time()
        all_results = []
        
        for img in imgs:
            result = self.det_model.detect(img)
            bboxes, keypoints = result

            if bboxes.shape[0] == 0:
                empty_bboxes = np.array([], dtype=np.float32).reshape(0, 5)
                empty_keypoints = np.array([], dtype=np.float32).reshape(0, 5, 2)
                all_results.append((empty_bboxes, empty_keypoints))
            else:
                all_results.append((bboxes, keypoints))

        processing_time = time.time() - start_time
        return all_results, processing_time

    def extract_face_embeddings(self, cropped_images):
        """
        Get face embeddings from cropped images (batch processing)
        
        Args:
            cropped_images: List of cropped face images
            
        Returns:
            tuple: (embeddings, processing_time)
                - embeddings: Normalized embeddings
                - processing_time: Time taken for recognition in seconds
        """
        if not cropped_images:
            return [], 0.0

        start_time = time.time()
        embeddings = self.rec_model.get_feat(cropped_images)
        normalized_embeddings = normalize_embeddings(embeddings)
        processing_time = time.time() - start_time
        
        return normalized_embeddings, processing_time

    def _crop_faces_from_detection(self, frames, detection_results):
        """
        Crop faces from detection results.

        Args:
            frames (List[np.ndarray]): Danh sách frame (mỗi phần tử là frame từ camera).
            detection_results (List[Tuple[np.ndarray, np.ndarray]]): Danh sách kết quả detect cho mỗi frame, mỗi phần tử là tuple (bboxes, keypoints).

        Returns:
            tuple:
                all_cropped_faces (List[np.ndarray]):
                    Danh sách tất cả khuôn mặt đã được crop, gộp phẳng (flatten) từ toàn bộ frames.
                    Ví dụ: nếu ảnh 1 có 0 face, ảnh 2 có 3 face, ảnh 3 có 4 face, ảnh 4 có 1 face,
                    thì `all_cropped_faces` sẽ chứa tổng cộng 8 mảng numpy (mỗi mảng là 1 khuôn mặt).
                face_counts (List[int]):
                    Danh sách số lượng khuôn mặt trong từng ảnh theo cùng thứ tự với `frames`.
                    Ví dụ: `[0, 3, 4, 1]` nghĩa là ảnh 1 không có face, ảnh 2 có 3 faces, ảnh 3 có 4 faces, ảnh 4 có 1 face.
        """
        all_cropped_faces = []
        face_counts = []
        
        for frame, (bboxes, keypoints) in zip(frames, detection_results):
            if len(bboxes) > 0:
                cropped_faces = crop_and_align_faces(frame, bboxes, keypoints, conf_threshold=self.face_detection_threshold)
                all_cropped_faces.extend(cropped_faces)
                face_counts.append(len(cropped_faces))
            else:
                face_counts.append(0)
        
        return all_cropped_faces, face_counts

    def _distribute_recognition_results(self, all_user_infos, face_counts):
        """
        Distribute recognition results back to images
        
        Args:
            all_user_infos: List of user info for all faces
            face_counts: Number of faces per image
            
        Returns:
            List of user info lists per image
        """
        results_per_frame = []
        start_idx = 0
        
        for face_count in face_counts:
            if face_count > 0:
                frame_user_infos = all_user_infos[start_idx:start_idx + face_count]
                results_per_frame.append(frame_user_infos)
                start_idx += face_count
            else:
                results_per_frame.append([])
        
        return results_per_frame

    def _detection_worker(self):
        """Detection thread worker - only handles detection"""
        LOGGER.info("Detection thread started")
        
        while self.state.running:
            try:
                # Lấy frames từ queue
                frame_data = self.state.detection_input_queue.get(timeout=0.1)
                
                if frame_data is None:  # Shutdown signal
                    break
                    
                frames, source_ids, frame_id = frame_data
                
                # Batch detection cho tất cả sources
                detection_results, detection_time = self.detect_faces(frames)

                if self.verbose and not self.face_recognition:
                    total_faces = sum(len(bboxes) for bboxes, _ in detection_results)
                    face_text = "Face" if total_faces == 1 else "Faces"
                    LOGGER.info(f"Frame {frame_id}: Det={detection_time:.3f}s | {total_faces} {face_text}")
                
                # Tạo detection batch result (bao gồm frames gốc)
                result = DetectionBatchResult(
                    results_per_source=detection_results,
                    frames=frames,  # Lưu frames gốc
                    source_ids=source_ids,
                    timestamp=time.time(),
                    frame_id=frame_id,
                    processing_time=detection_time
                )
                
                # Gửi kết quả detection (non-blocking)
                try:
                    self.state.detection_output_queue.put_nowait(result)
                except queue.Full:
                    # Queue full, replace old result
                    try:
                        self.state.detection_output_queue.get_nowait()
                        self.state.detection_output_queue.put_nowait(result)
                    except queue.Empty:
                        pass

            except queue.Empty:
                continue
            except Exception as e:
                LOGGER.error(f"Detection worker error: {e}")
                continue
        
        LOGGER.info("Detection thread stopped")

    def _recognition_worker(self):
        """Recognition thread worker - handles cropping, recognition, and search"""
        LOGGER.info("Recognition thread started")
        
        while self.state.running:
            try:
                # Lấy detection result từ queue
                detection_result = self.state.recognition_input_queue.get(timeout=0.1)
                
                if detection_result is None:  # Shutdown signal
                    break
                
                # Unpack detection result
                frames = detection_result.frames
                source_ids = detection_result.source_ids
                detection_results = detection_result.results_per_source
                frame_id = detection_result.frame_id
                
                start_time = time.time()
                
                # Crop faces từ detection results
                crop_start = time.time()
                all_cropped_faces, face_counts = self._crop_faces_from_detection(frames, detection_results)
                crop_time = time.time() - crop_start
                
                # Recognition cho tất cả faces
                if all_cropped_faces:
                    all_embeddings, embedding_time = self.extract_face_embeddings(all_cropped_faces)

                    search_start = time.time()
                    all_user_infos = search_ids(embeddings=all_embeddings, threshold=self.face_recognition_threshold)
                    search_time = time.time() - search_start

                    if self.verbose:
                        total_faces = sum(face_counts)
                        face_text = "Face" if total_faces == 1 else "Faces"
                        rec_time = crop_time + embedding_time + search_time
                        total_time = detection_result.processing_time + rec_time
                        
                        LOGGER.info(f"Frame {frame_id}: Det={detection_result.processing_time:.3f}s | "
                                f"Rec={rec_time:.3f}s | Total={total_time:.3f}s | "
                                f"{total_faces} {face_text}")

                    # Distribute results back to sources
                    results_per_source = self._distribute_recognition_results(all_user_infos, face_counts)
                else:
                    if self.verbose:
                        LOGGER.info(f"Frame {frame_id}: Det={detection_result.processing_time:.3f}s | No faces detected")
                    results_per_source = [[] for _ in source_ids]
                
                total_recognition_time = time.time() - start_time
                
                # Tạo recognition batch result (bao gồm cả bboxes)
                result = RecognitionBatchResult(
                    results_per_source=results_per_source,
                    bboxes_per_source=detection_results,
                    source_ids=source_ids,
                    timestamp=time.time(),
                    frame_id=frame_id,
                    processing_time=total_recognition_time
                )
                
                # Gửi kết quả (non-blocking)
                try:
                    self.state.recognition_output_queue.put_nowait(result)
                except queue.Full:
                    # Queue full, replace old result
                    try:
                        self.state.recognition_output_queue.get_nowait()
                        self.state.recognition_output_queue.put_nowait(result)
                    except queue.Empty:
                        pass
                        
            except queue.Empty:
                continue
            except Exception as e:
                LOGGER.error(f"Recognition worker error: {e}")
                continue
        
        LOGGER.info("Recognition thread stopped")

    def _api_sender_worker(self):
        """API sender thread worker - gửi data lên backend (chạy ở background)"""
        LOGGER.info("API sender thread started")

        # Check config before entering loop
        if not UPDATE_ATTENDANCE_API_URL:
            LOGGER.error("UPDATE_ATTENDANCE_API_URL not configured, API sender disabled")
            return
        
        if not UPDATE_ATTENDANCE_API_KEY:
            LOGGER.error("UPDATE_ATTENDANCE_API_KEY not configured, API sender disabled")
            return
    
        LOGGER.info(f"API sender configured: {UPDATE_ATTENDANCE_API_URL}")
        
        while self.state.running:
            try:
                # Lấy payload từ queue (blocking với timeout)
                payload = self.state.api_queue.get(timeout=0.5)
                
                if payload is None:  # Shutdown signal
                    break
                
                # Kiểm tra nếu không có data thì bỏ qua
                if not payload.get("data"):
                    continue

                # Headers với API key
                headers = {
                    'X-API-Key': UPDATE_ATTENDANCE_API_KEY
                }
                
                try:
                    # Gửi API request
                    response = requests.post(
                        UPDATE_ATTENDANCE_API_URL,
                        json=payload,
                        headers=headers,
                        timeout=5.0  # Timeout 5s
                    )
                    
                    if response.status_code == 200:
                        result = response.json()
                        if self.verbose:
                            LOGGER.info(f"API Response: {result.get('message', 'Success')} | {len(result.get('results', []))} users processed")
                            
                            # Hiển thị welcome/goodbye messages
                            for user_result in result.get('results', []):
                                if user_result.get('send_welcome'):
                                    LOGGER.info(f"{user_result.get('message', '')}")
                                elif user_result.get('send_goodbye'):
                                    LOGGER.info(f"{user_result.get('message', '')}")
                    elif response.status_code == 401:
                        LOGGER.error(f"Authentication failed: Invalid API key")
                    else:
                        LOGGER.warning(f"API request failed with status {response.status_code}")
                        
                except requests.exceptions.Timeout:
                    LOGGER.warning("API request timeout")
                except requests.exceptions.RequestException as e:
                    LOGGER.error(f"API request error: {e}")
                    
            except queue.Empty:
                continue
            except Exception as e:
                LOGGER.error(f"API sender worker error: {e}")
                continue
        
        LOGGER.info("API sender thread stopped")

    def start_threads(self):
        """Start detection and recognition threads"""
        self.state.running = True
        
        # Start detection thread if needed
        if self.face_detection:
            self.detection_thread = threading.Thread(target=self._detection_worker, daemon=True)
            self.detection_thread.start()
        
        # Start recognition thread if needed
        if self.face_recognition:
            self.recognition_thread = threading.Thread(target=self._recognition_worker, daemon=True)
            self.recognition_thread.start()
            
            # Start API sender thread (chỉ khi có recognition và enable_face_data_save là True)
            if self.enable_face_data_save:
                self.api_sender_thread = threading.Thread(target=self._api_sender_worker, daemon=True)
                self.api_sender_thread.start()
        
        LOGGER.info("Sequential pipeline threads started")

    def stop_threads(self):
        """Stop all threads gracefully"""
        self.state.running = False
        
        # Send shutdown signals
        try:
            self.state.detection_input_queue.put_nowait(None)
        except queue.Full:
            pass
            
        try:
            self.state.recognition_input_queue.put_nowait(None)
        except queue.Full:
            pass
            
        try:
            self.state.api_queue.put_nowait(None)
        except queue.Full:
            pass
        
        # Wait for threads to finish
        if self.detection_thread:
            self.detection_thread.join(timeout=2.0)
        if self.recognition_thread:
            self.recognition_thread.join(timeout=2.0)
        if self.api_sender_thread:
            self.api_sender_thread.join(timeout=2.0)
            
        LOGGER.info("Sequential pipeline threads stopped")

    def get_frame(self, frames, source_idx, webcam=False):
        """Get single frame from frames list
        
        Args:
            frames: List of frames or single frame
            source_idx: Index of source in list
            webcam: Whether input is from webcam
            
        Returns:
            np.ndarray: Single frame
        """
        if webcam:
            return frames[source_idx]
        return frames

    def _try_send_to_pipeline(self, frames, frame_id):
        """Thử gửi frames vào pipeline nếu rảnh (non-blocking)
        
        Args:
            frames: List of frames from all sources
            frame_id: ID of current frame batch
        """
        if not self.state.pipeline_busy.locked():
            if self.state.pipeline_busy.acquire(blocking=False):
                try:
                    frame_data = (frames, self.source_ids, frame_id)
                    self.state.detection_input_queue.put_nowait(frame_data)
                except queue.Full:
                    # Queue full, release lock và skip
                    self.state.pipeline_busy.release()
    
    def _check_detection_results(self):
        """Kiểm tra và xử lý kết quả detection (non-blocking)"""
        try:
            detection_result = self.state.detection_output_queue.get_nowait()
            
            # Forward to recognition if enabled
            if self.face_recognition:
                try:
                    # Gửi detection_result (chứa cả frames bên trong)
                    self.state.recognition_input_queue.put_nowait(detection_result)
                except queue.Full:
                    if self.verbose:
                        LOGGER.warning(f"Recognition queue full, skipping recognition for frame {detection_result.frame_id}")
                    # Nếu recognition queue full, release lock
                    self.state.pipeline_busy.release()
            else:
                # No recognition: Tạo cached_result trực tiếp từ detection
                self.state.cached_result = RecognitionBatchResult(
                    results_per_source=[[] for _ in detection_result.source_ids],
                    bboxes_per_source=detection_result.results_per_source,
                    source_ids=detection_result.source_ids,
                    timestamp=detection_result.timestamp,
                    frame_id=detection_result.frame_id,
                    processing_time=detection_result.processing_time
                )
                # Release pipeline lock
                self.state.pipeline_busy.release()
                
        except queue.Empty:
            pass
    
    def _check_recognition_results(self):
        """Kiểm tra và cache kết quả recognition (non-blocking)"""
        try:
            recognition_result = self.state.recognition_output_queue.get_nowait()

            # Cache kết quả (detection + recognition cùng frame)
            self.state.cached_result = recognition_result

            # Recognition complete, release pipeline lock
            self.state.pipeline_busy.release()
            
            # Gửi API nếu đủ thời gian throttle
            self._try_send_to_api(recognition_result)
            
        except queue.Empty:
            pass
    
    def _try_send_to_api(self, recognition_result: RecognitionBatchResult):
        """
        Thử gửi kết quả recognition lên API (với throttling)
        
        Args:
            recognition_result: Kết quả recognition mới nhất
        """
        current_time = time.time()
        
        # Kiểm tra throttle: chỉ gửi nếu đã quá interval
        if current_time - self.state.last_api_send_time < self.face_data_save_interval_sec:
            return
        
        # Kiểm tra nếu có data (có ít nhất 1 user được nhận diện)
        has_data = any(
            len([r for r in results if r is not None]) > 0 
            for results in recognition_result.results_per_source
        )
        
        if not has_data:
            return
        
        try:
            # Tạo payload
            payload = recognition_result.to_api_payload()
            
            # Gửi vào queue (non-blocking)
            self.state.api_queue.put_nowait(payload)
            
            # Cập nhật thời gian gửi cuối
            self.state.last_api_send_time = current_time
            
            if self.verbose:
                LOGGER.info(f"Queued API request with {len(payload['data'])} detections")
                
        except queue.Full:
            if self.verbose:
                LOGGER.warning("API queue full, skipping this batch")

    def _process_pipeline(self, frames, frame_id):
        """
        Xử lý pipeline: gửi frames vào, kiểm tra detection, kiểm tra recognition
        
        Args:
            frames: List of frames from all sources (List[np.ndarray])
            frame_id: ID of current frame batch
            
        Returns:
            None (cập nhật self.state.cached_result nếu có kết quả mới)
        """
        # Bước 1: Thử gửi frames vào pipeline nếu rảnh
        self._try_send_to_pipeline(frames, frame_id)
        
        # Bước 2: Kiểm tra kết quả detection và forward sang recognition
        self._check_detection_results()
        
        # Bước 3: Kiểm tra kết quả recognition (kết quả cuối cùng)
        self._check_recognition_results()

    def run_inference(self):
        """
        Run sequential multi-source inference with atomic pipeline
        """
        windows = []
        
        # Start inference threads
        self.start_threads()
        
        try:
            for path, frames, vid_cap, s in self.dataset:
                self.state.frame_counter += 1
                
                # Xử lý pipeline: gửi vào + kiểm tra kết quả
                self._process_pipeline(frames, self.state.frame_counter)
                
                # Render frames cho từng camera
                if self.needs_rendering:
                    for source_idx, source_id in enumerate(self.source_ids):
                        frame = self.get_frame(frames, source_idx, webcam=self.webcam)
                        self._render_frame(frame=frame, path=path, source_idx=source_idx, source_id=source_id, vid_cap=vid_cap, windows=windows)
                    
        finally:
            self.stop_threads()

    def _render_frame(self, frame, path, source_idx, source_id, vid_cap, windows):
        """Render frame với cached results (detection + recognition cùng frame)
        
        Args:
            frame: Frame gốc từ source (np.ndarray)
            path: Đường dẫn file/source
            source_idx: Index của source trong list (0, 1, 2, ...)
            source_id: ID thực của source
            vid_cap: Video capture object
            windows: List các window đang mở
        """
        p = path[source_idx] if self.webcam else path
        p = Path(p)
        save_path = str(self.save_dir / f"{p.stem}_cam{source_id}{p.suffix}") if (self.save or self.save_crop) else None
        original_frame = frame.copy() if self.save_crop else None
        annotator = Annotator(frame, line_width=self.line_thickness)
        
        # Lấy kết quả từ cache (detection + recognition cùng frame)
        bboxes = np.array([]).reshape(0, 5)
        user_infos = []
        
        # Sử dụng cached result nếu có
        if self.state.cached_result is not None and source_id in self.state.cached_result.source_ids:
            source_result_idx = self.state.cached_result.source_ids.index(source_id)
            
            # Lấy bboxes và recognition results (cùng frame)
            if source_result_idx < len(self.state.cached_result.bboxes_per_source):
                bboxes, _ = self.state.cached_result.bboxes_per_source[source_result_idx]
                
            if source_result_idx < len(self.state.cached_result.results_per_source):
                user_infos = self.state.cached_result.results_per_source[source_result_idx]
        
        # Nếu không có cached result, hiển thị frame trống
        
        # Render boxes với logic conditional
        if self.face_detection and len(bboxes) > 0:
            for idx, bbox in enumerate(bboxes):
                conf = bbox[4]
                user_info = user_infos[idx] if idx < len(user_infos) else None
                
                if self.save or self.save_crop or self.show:
                    label = None
                    
                    if self.face_recognition and user_info is not None:
                        # Có recognition result: hiển thị name + similarity
                        label = f"{user_info.full_name} {user_info.similarity*100:.1f}%"
                    elif not self.face_recognition:
                        # Chỉ detection: không có label, chỉ bounding box
                        label = None
                    
                    color = (0, int(255 * conf), int(255 * (1 - conf)))
                    annotator.box_label(bbox[:4], label, color=color)
            
                # Save crop if needed
                if self.save_crop:
                    crops_dir = Path(self.save_dir) / 'crops'
                    crops_dir.mkdir(parents=True, exist_ok=True)
                    face_crop = crop_image(original_frame, bbox[:4])
                    cv2.imwrite(str(crops_dir / f'{p.stem}_source{source_id}_{idx}.jpg'), face_crop)
        
        # Hiển thị frame
        frame = annotator.result()
        if self.show:
            window_name = f"{str(p)} source: {source_id}"
            if platform.system() == 'Linux' and window_name not in windows:
                windows.append(window_name)
                cv2.namedWindow(window_name, cv2.WINDOW_NORMAL | cv2.WINDOW_KEEPRATIO)
                cv2.resizeWindow(window_name, frame.shape[1], frame.shape[0])
            
            cv2.imshow(window_name, frame)
            cv2.waitKey(1)  # Non-blocking
        
        # Save video/image
        if self.save and save_path:
            if self.dataset.mode == 'image':
                cv2.imwrite(save_path, frame)
            else:
                self._save_video(source_idx, save_path, vid_cap, frame)

    def _save_video(self, source_idx, save_path, vid_cap, frame):
        """Function to save video frames
        
        Args:
            source_idx: Index of source in list
            save_path: Path to save video
            vid_cap: Video capture object
            frame: Frame to save
        """
        if self.vid_path[source_idx] != save_path:
            self.vid_path[source_idx] = save_path
            if isinstance(self.vid_writer[source_idx], cv2.VideoWriter):
                self.vid_writer[source_idx].release()
            fps = vid_cap.get(cv2.CAP_PROP_FPS) if vid_cap else 10
            w, h = (int(vid_cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(vid_cap.get(cv2.CAP_PROP_FRAME_HEIGHT))) if vid_cap else (frame.shape[1], frame.shape[0])
            save_path = str(Path(save_path).with_suffix('.mp4'))
            self.vid_writer[source_idx] = cv2.VideoWriter(save_path, cv2.VideoWriter_fourcc(*'mp4v'), fps, (w, h))
        self.vid_writer[source_idx].write(frame)

    def _release_writers(self):
        """Function to release video writers"""
        for writer in self.vid_writer:
            if isinstance(writer, cv2.VideoWriter):
                writer.release()
                LOGGER.info("Video writer released successfully.")