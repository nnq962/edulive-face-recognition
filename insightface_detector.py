import cv2
import os
import platform
from insightface.model_zoo import model_zoo
from pathlib import Path
import time
import numpy as np
from utils.plots import Annotator
from utils import LOGGER
from config import paths
import threading
import queue
from dataclasses import dataclass
from typing import List, Tuple, Optional, Dict, Any


@dataclass
class MultiCameraDetectionResult:
    """Kết quả detection cho multi-camera"""
    results_per_camera: List[Tuple[np.ndarray, np.ndarray]]  # [(bboxes, keypoints)] cho mỗi camera
    camera_ids: List[int]
    timestamp: float
    frame_id: int
    processing_time: float


@dataclass
class MultiCameraRecognitionResult:
    """Kết quả recognition cho multi-camera"""
    results_per_camera: List[List[Dict[str, Any]]]  # [[user_info]] cho mỗi camera
    camera_ids: List[int]
    timestamp: float
    frame_id: int
    processing_time: float


class ThreadedInferenceState:
    """Quản lý state cho threaded inference"""
    def __init__(self):
        self.current_detections: Optional[MultiCameraDetectionResult] = None
        self.current_recognitions: Optional[MultiCameraRecognitionResult] = None
        self.pipeline_busy = threading.Lock()  # Single flag cho cả pipeline
        self.frame_counter = 0
        self.running = False
        
        # Queues cho sequential pipeline
        self.detection_input_queue = queue.Queue(maxsize=1)
        self.detection_output_queue = queue.Queue(maxsize=1)
        self.recognition_input_queue = queue.Queue(maxsize=1)
        self.recognition_output_queue = queue.Queue(maxsize=1)


class InsightFaceDetector:
    """
    Face detector using InsightFace with sequential multi-camera pipeline
    """
    def __init__(
        self,
        face_detection=True,
        face_recognition=False,
        show=False,
        thickness=3,
        verbose=False,
        media_manager=None,
    ):
        self.face_detection = face_detection
        self.face_recognition = face_recognition
        self.show = show
        self.line_thickness = thickness
        self.verbose = verbose

        self.media_manager = media_manager

        self.det_model = None
        self.rec_model = None
        self.load_model()
        
        # Threading components
        self.state = ThreadedInferenceState()
        self.detection_thread = None
        self.recognition_thread = None

    def load_model(self):
        """Load detection and recognition models"""
        try:
            # Load detection model
            LOGGER.info(f"Loading detection model: {paths.DET_MODEL_PATH}")
            self.det_model = model_zoo.get_model(str(paths.DET_MODEL_PATH))
            self.det_model.prepare(ctx_id=0, input_size=(640, 640))
            LOGGER.info("Detection model loaded successfully.")
        except Exception as e:
            LOGGER.error(f"Failed to load detection model: {e}")
            self.det_model = None

        if self.face_recognition:
            try:
                # Load recognition model
                LOGGER.info(f"Loading recognition model: {paths.REC_MODEL_PATH}")
                self.rec_model = model_zoo.get_model(str(paths.REC_MODEL_PATH))
                self.rec_model.prepare(ctx_id=0)
                LOGGER.info("Recognition model loaded successfully.")
            except Exception as e:
                LOGGER.error(f"Failed to load recognition model: {e}")
                self.rec_model = None

    def get_face_detects(self, imgs):
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

    def get_face_embeddings(self, cropped_images):
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
        Crop faces from detection results
        
        Args:
            frames: List of camera frames
            detection_results: List of (bboxes, keypoints) for each camera
            
        Returns:
            tuple: (all_cropped_faces, camera_face_counts)
        """
        all_cropped_faces = []
        camera_face_counts = []
        
        for frame, (bboxes, keypoints) in zip(frames, detection_results):
            if len(bboxes) > 0:
                cropped_faces = crop_and_align_faces(frame, bboxes, keypoints, 0.55)
                all_cropped_faces.extend(cropped_faces)
                camera_face_counts.append(len(cropped_faces))
            else:
                camera_face_counts.append(0)
        
        return all_cropped_faces, camera_face_counts

    def _distribute_recognition_results(self, all_user_infos, camera_face_counts):
        """
        Distribute recognition results back to cameras
        
        Args:
            all_user_infos: List of user info for all faces
            camera_face_counts: Number of faces per camera
            
        Returns:
            List of user info lists per camera
        """
        results_per_camera = []
        start_idx = 0
        
        for face_count in camera_face_counts:
            if face_count > 0:
                camera_user_infos = all_user_infos[start_idx:start_idx + face_count]
                results_per_camera.append(camera_user_infos)
                start_idx += face_count
            else:
                results_per_camera.append([])
        
        return results_per_camera

    def _detection_worker(self):
        """Detection thread worker - only handles detection"""
        LOGGER.info("Multi-camera detection thread started")
        
        while self.state.running:
            try:
                # Lấy multi-camera frames từ queue
                multi_frame_data = self.state.detection_input_queue.get(timeout=0.1)
                
                if multi_frame_data is None:  # Shutdown signal
                    break
                    
                frames, camera_ids, frame_id = multi_frame_data
                
                # Batch detection cho tất cả cameras
                detection_results, detection_time = self.get_face_detects(frames)

                LOGGER.debug(f"Detection results: {detection_results}")
                LOGGER.debug(f"Detection time: {detection_time}")
                
                if self.verbose:
                    LOGGER.info(f"Batch detection took {detection_time:.3f}s for {len(frames)} cameras (frame {frame_id})")
                
                # Tạo multi-camera detection result
                result = MultiCameraDetectionResult(
                    results_per_camera=detection_results,
                    camera_ids=camera_ids,
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
        
        LOGGER.info("Multi-camera detection thread stopped")

    def _recognition_worker(self):
        """Recognition thread worker - handles cropping, recognition, and search"""
        LOGGER.info("Multi-camera recognition thread started")
        
        while self.state.running:
            try:
                # Lấy detection result từ queue
                detection_result = self.state.recognition_input_queue.get(timeout=0.1)
                
                if detection_result is None:  # Shutdown signal
                    break
                
                frames, detection_result_data = detection_result
                camera_ids = detection_result_data.camera_ids
                detection_results = detection_result_data.results_per_camera
                frame_id = detection_result_data.frame_id
                
                start_time = time.time()
                
                # Crop faces từ detection results
                all_cropped_faces, camera_face_counts = self._crop_faces_from_detection(frames, detection_results)
                
                # Recognition cho tất cả faces
                if all_cropped_faces:
                    all_embeddings, embedding_time = self.get_face_embeddings(all_cropped_faces)
                    all_user_infos = search_ids(embeddings=all_embeddings, threshold=0.6)
                    
                    # Distribute results back to cameras
                    results_per_camera = self._distribute_recognition_results(all_user_infos, camera_face_counts)
                else:
                    results_per_camera = [[] for _ in camera_ids]
                
                total_recognition_time = time.time() - start_time
                
                if self.verbose:
                    total_faces = sum(camera_face_counts)
                    LOGGER.info(f"Batch recognition took {total_recognition_time:.3f}s for {total_faces} faces "
                              f"across {len(camera_ids)} cameras (frame {frame_id})")
                
                # Tạo multi-camera recognition result
                result = MultiCameraRecognitionResult(
                    results_per_camera=results_per_camera,
                    camera_ids=camera_ids,
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
        
        LOGGER.info("Multi-camera recognition thread stopped")

    def start_threads(self):
        """Start detection and recognition threads"""
        self.state.running = True
        
        # Start detection thread
        self.detection_thread = threading.Thread(target=self._detection_worker, daemon=True)
        self.detection_thread.start()
        
        # Start recognition thread if needed
        if self.face_recognition:
            self.recognition_thread = threading.Thread(target=self._recognition_worker, daemon=True)
            self.recognition_thread.start()
        
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
        
        # Wait for threads to finish
        if self.detection_thread:
            self.detection_thread.join(timeout=2.0)
        if self.recognition_thread:
            self.recognition_thread.join(timeout=2.0)
            
        LOGGER.info("Sequential pipeline threads stopped")

    def get_frame(self, im0s, i, webcam=False):
        """Get single frame from dataset"""
        if webcam:
            return im0s[i]
        return im0s

    def run_inference(self):
        """
        Run sequential multi-camera inference
        """
        windows = []
        start_time = time.time()
        
        # Start inference threads
        self.start_threads()
        
        try:
            for path, im0s, vid_cap, s in self.media_manager.dataset:
                self.state.frame_counter += 1
                
                # Try acquire pipeline lock (non-blocking)
                if self.state.pipeline_busy.acquire(blocking=False):
                    try:
                        # Gửi frames cho detection
                        multi_frame_data = (im0s, self.media_manager.camera_ids, self.state.frame_counter)
                        self.state.detection_input_queue.put_nowait(multi_frame_data)
                    except queue.Full:
                        # Queue full, skip this batch
                        pass
                    finally:
                        # Release lock sẽ được handle bởi pipeline completion
                        pass
                else:
                    # Pipeline busy, skip this frame
                    if self.verbose:
                        LOGGER.debug(f"Pipeline busy, skipping frame {self.state.frame_counter}")
                
                # Check for detection results (non-blocking)
                try:
                    detection_result = self.state.detection_output_queue.get_nowait()
                    self.state.current_detections = detection_result
                    
                    if self.verbose:
                        LOGGER.info(f"Updated batch detection for frame {detection_result.frame_id} "
                                  f"(took {detection_result.processing_time:.3f}s)")
                    
                    # Forward to recognition if enabled
                    if self.face_recognition:
                        try:
                            # Cần gửi frames cùng với detection result
                            frames = im0s  # Current frames
                            recognition_input = (frames, detection_result)
                            self.state.recognition_input_queue.put_nowait(recognition_input)
                        except queue.Full:
                            # Recognition queue full, skip
                            self.state.pipeline_busy.release()  # Release pipeline lock
                    else:
                        # No recognition, release pipeline lock
                        self.state.pipeline_busy.release()
                        
                except queue.Empty:
                    pass
                
                # Check for recognition results (non-blocking)
                try:
                    recognition_result = self.state.recognition_output_queue.get_nowait()
                    self.state.current_recognitions = recognition_result
                    
                    if self.verbose:
                        LOGGER.info(f"Updated batch recognition for frame {recognition_result.frame_id} "
                                  f"(took {recognition_result.processing_time:.3f}s)")
                    
                    # Recognition complete, release pipeline lock
                    self.state.pipeline_busy.release()
                    
                except queue.Empty:
                    pass
                
                # Render frames cho từng camera
                camera_ids = self.media_manager.camera_ids
                for camera_idx, camera_id in enumerate(camera_ids):
                    frame = im0s[camera_idx] if isinstance(im0s, list) else im0s
                    self._render_frame(frame, path, camera_idx, camera_id, vid_cap, windows)
                    
        finally:
            self.stop_threads()

    def _render_frame(self, im0, path, img_index, camera_id, vid_cap, windows):
        """Render frame với current detection/recognition results cho specific camera"""
        p = path[img_index] if self.media_manager.webcam else path
        p = Path(p)
        save_path = str(self.media_manager.save_dir / f"{p.stem}_cam{camera_id}{p.suffix}") if (self.media_manager.save or self.media_manager.save_crop) else None
        imc = im0.copy() if self.media_manager.save_crop else None
        annotator = Annotator(im0, line_width=self.line_thickness)
        
        # Lấy detection và recognition results cho camera này
        bboxes = np.array([]).reshape(0, 5)
        keypoints = np.array([]).reshape(0, 5, 2)
        user_infos = []
        detection_time = 0.0
        recognition_time = 0.0
        
        # Sử dụng current detections nếu có
        if (self.state.current_detections is not None and 
            camera_id in self.state.current_detections.camera_ids):
            
            camera_idx = self.state.current_detections.camera_ids.index(camera_id)
            if camera_idx < len(self.state.current_detections.results_per_camera):
                bboxes, keypoints = self.state.current_detections.results_per_camera[camera_idx]
                detection_time = self.state.current_detections.processing_time
        
        # Sử dụng current recognitions nếu có và match
        if (self.state.current_recognitions is not None and 
            camera_id in self.state.current_recognitions.camera_ids and
            len(bboxes) > 0):
            
            camera_idx = self.state.current_recognitions.camera_ids.index(camera_id)
            if camera_idx < len(self.state.current_recognitions.results_per_camera):
                camera_user_infos = self.state.current_recognitions.results_per_camera[camera_idx]
                if len(camera_user_infos) == len(bboxes):
                    user_infos = camera_user_infos
                    recognition_time = self.state.current_recognitions.processing_time
        
        # Fallback to unknown nếu không có recognition results
        if len(user_infos) != len(bboxes):
            user_infos = [None] * len(bboxes)
        
        # Render boxes với timing info
        for idx, bbox in enumerate(bboxes):
            conf = bbox[4]
            user_info = user_infos[idx] if idx < len(user_infos) else None
            
            if self.media_manager.save or self.media_manager.save_crop or self.show:
                # Tạo label với timing info
                if user_info:
                    label = f"{user_info.get('name', 'Unknown')} {user_info.get('similarity', 0)*100:.1f}%"
                    if self.verbose:
                        label += f" (D:{detection_time:.2f}s R:{recognition_time:.2f}s)"
                else:
                    label = f"Face {conf:.2f}"
                    if self.verbose:
                        label += f" (D:{detection_time:.2f}s)"
                
                color = (0, int(255 * conf), int(255 * (1 - conf)))
                annotator.box_label(bbox[:4], label, color=color)
            
            # Save crop if needed
            if self.media_manager.save_crop:
                crops_dir = Path(self.media_manager.save_dir) / 'crops'
                crops_dir.mkdir(parents=True, exist_ok=True)
                face_crop = crop_image(imc, bbox[:4])
                cv2.imwrite(str(crops_dir / f'{p.stem}_cam{camera_id}_{idx}.jpg'), face_crop)
        
        # Hiển thị frame
        im0 = annotator.result()
        if self.show:
            window_name = f"{str(p)}_cam{camera_id}"
            if platform.system() == 'Linux' and window_name not in windows:
                windows.append(window_name)
                cv2.namedWindow(window_name, cv2.WINDOW_NORMAL | cv2.WINDOW_KEEPRATIO)
                cv2.resizeWindow(window_name, im0.shape[1], im0.shape[0])
            
            cv2.imshow(window_name, im0)
            cv2.waitKey(1)  # Non-blocking
        
        # Save video/image
        if self.media_manager.save and save_path:
            if self.media_manager.dataset.mode == 'image':
                cv2.imwrite(save_path, im0)
            else:
                self._save_video(img_index, save_path, vid_cap, im0)

    def _save_video(self, img_index, save_path, vid_cap, im0):
        """Function to save video frames"""
        if self.vid_path[img_index] != save_path:
            self.vid_path[img_index] = save_path
            if isinstance(self.vid_writer[img_index], cv2.VideoWriter):
                self.vid_writer[img_index].release()
            fps = vid_cap.get(cv2.CAP_PROP_FPS) if vid_cap else 10
            w, h = (int(vid_cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(vid_cap.get(cv2.CAP_PROP_FRAME_HEIGHT))) if vid_cap else (im0.shape[1], im0.shape[0])
            save_path = str(Path(save_path).with_suffix('.mp4'))
            self.vid_writer[img_index] = cv2.VideoWriter(save_path, cv2.VideoWriter_fourcc(*'mp4v'), fps, (w, h))
        self.vid_writer[img_index].write(im0)

    def _release_writers(self):
        """Function to release video writers"""
        for writer in self.media_manager.vid_writer:
            if isinstance(writer, cv2.VideoWriter):
                writer.release()
                LOGGER.info("Video writer released successfully.")


# Helper functions (cần implement riêng)
def crop_and_align_faces(image, bboxes, keypoints, margin=0.55):
    """Crop and align faces from image"""
    # Implementation here
    pass

def normalize_embeddings(embeddings):
    """Normalize face embeddings"""
    # Implementation here
    pass

def search_ids(embeddings, threshold=0.6):
    """Search user IDs from embeddings"""
    # Implementation here
    pass

def crop_image(image, bbox):
    """Crop image with bounding box"""
    x1, y1, x2, y2 = map(int, bbox)
    return image[y1:y2, x1:x2]