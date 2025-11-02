from ai_service.insightface_detector import InsightFaceDetector
from typing import List, Tuple
import numpy as np
import cv2
import faiss
import pickle
import numpy as np
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorDatabase
from utils import LOGGER
from config import paths
from unidecode import unidecode
from config import network, keys
import requests


UPDATE_FAISS_API_KEY = keys.UPDATE_FAISS_API_KEY
UPDATE_FAISS_API_URL = network.UPDATE_FAISS_API_URL
detector = InsightFaceDetector(
    face_detection=True,
    face_detection_threshold=0.65,
    face_recognition=True
)


def detect_faces(image_path: str):
    """Phát hiện khuôn mặt trong 1 ảnh, trả về ảnh, kết quả detect, thời gian, và số khuôn mặt."""
    image = cv2.imread(image_path)
    detection_results, detection_time = detector.detect_faces([image])  # batch 1
    bboxes, _ = detection_results[0]
    num_faces = bboxes.shape[0]
    return image, detection_results, detection_time, num_faces


def get_face_embeddings(images: List[np.ndarray], detection_results: List[Tuple[np.ndarray, np.ndarray]]) -> List[np.ndarray]:
    """Trích xuất face embeddings từ danh sách ảnh và kết quả detect đã có."""
    all_cropped_faces, _ = detector._crop_faces_from_detection(images, detection_results)
    face_embeddings, _ = detector.extract_face_embeddings(all_cropped_faces)
    return face_embeddings


def upload_faiss_to_ai_service(faiss_path: Path, mapping_path: Path) -> bool:
    """
    Upload FAISS and mapping file to AI Service
    
    Args:
        faiss_path: Path to face_index.faiss
        mapping_path: Path to faiss_mapping.pkl
        
    Returns:
        bool: True nếu upload thành công
    """
    
    if not UPDATE_FAISS_API_URL:
        LOGGER.warning("UPDATE_FAISS_API_URL not configured, skip uploading")
        return False

    if not UPDATE_FAISS_API_KEY:
        LOGGER.error("UPDATE_FAISS_API_KEY not configured in keys config")
        return False
    
    try:
        # Kiểm tra files tồn tại
        if not faiss_path.exists():
            LOGGER.error(f"FAISS file not found: {faiss_path}")
            return False
        
        if not mapping_path.exists():
            LOGGER.error(f"Mapping file not found: {mapping_path}")
            return False
        
        # Mở và upload files
        with open(faiss_path, 'rb') as faiss_file, \
             open(mapping_path, 'rb') as pkl_file:
            
            files = {
                'faiss_file': ('face_index.faiss', faiss_file, 'application/octet-stream'),
                'pkl_file': ('faiss_mapping.pkl', pkl_file, 'application/octet-stream')
            }

            # Headers với API key
            headers = {
                'X-API-Key': UPDATE_FAISS_API_KEY
            }
            
            LOGGER.info(f"Uploading face DB to AI Worker: {UPDATE_FAISS_API_URL}")
            
            # Gửi request
            response = requests.post(
                UPDATE_FAISS_API_URL,
                files=files,
                headers=headers,    
                timeout=30  # 30s timeout
            )
            
            if response.status_code == 200:
                result = response.json()
                LOGGER.info(f"Face DB uploaded successfully: {result.get('message', 'OK')}")
                
                # Log details nếu có
                if 'data' in result:
                    data = result['data']
                    LOGGER.info(f"   - FAISS size: {data.get('faiss_size', 0)} bytes")
                    LOGGER.info(f"   - PKL size: {data.get('pkl_size', 0)} bytes")
                
                return True
            else:
                LOGGER.error(f"Upload failed: {response.status_code} - {response.text}")
                return False
                
    except requests.exceptions.ConnectionError as e:
        LOGGER.error(f"Cannot connect to AI Worker: {e}")
        return False
    except requests.exceptions.Timeout:
        LOGGER.error(f"Upload timeout (>30s)")
        return False
    except Exception as e:
        LOGGER.error(f"Upload failed: {str(e)}")
        return False


async def rebuild_faiss_index(db: AsyncIOMotorDatabase, output_dir: Path = paths.BACKEND_TEMP_DIR):
    """
    Duyệt toàn bộ user, gom embeddings -> build lại FAISS index và mapping.pkl.

    Args:
        db: Mongo database instance
        output_dir: thư mục lưu index.faiss và mapping.pkl (default: backend/temp)
    """

    users_collection = db["users"]

    all_embeddings = []
    mapping = []
    total_users = 0

    cursor = users_collection.find({"is_active": True})
    async for user in cursor:
        total_users += 1
        user_id = str(user["_id"])
        full_name = user.get("full_name", "Unknown")

        face_embeds = user.get("face_embeddings", [])
        if not face_embeds:
            continue

        for face in face_embeds:
            emb = np.array(face["embedding"], dtype=np.float32)
            all_embeddings.append(emb)

            # Chuẩn hóa full_name sang tiếng Việt không dấu
            full_name_normalized = unidecode(full_name)

            mapping.append({
                "user_id": user_id,
                "full_name": full_name_normalized,
            })

    if not all_embeddings:
        LOGGER.warning("No embeddings found in database.")
        return {"status": "empty", "count": 0}

    embeddings_np = np.vstack(all_embeddings).astype("float32")
    dim = embeddings_np.shape[1]

    # Tạo FAISS index
    LOGGER.info(f"Building FAISS index with {len(all_embeddings)} vectors (dim={dim})...")
    index = faiss.IndexFlatIP(dim)
    index.add(embeddings_np)

    # Lưu index.faiss
    faiss_path = output_dir / "face_index.faiss"
    faiss.write_index(index, str(faiss_path))

    # Lưu mapping.pkl
    mapping_path = output_dir / "faiss_mapping.pkl"
    with open(mapping_path, "wb") as f:
        pickle.dump(mapping, f)

    LOGGER.info(f"Rebuilt FAISS index successfully:")
    LOGGER.info(f" - Total users: {total_users}")
    LOGGER.info(f" - Index: {faiss_path}")
    LOGGER.info(f" - Mapping: {mapping_path}")
    LOGGER.info(f" - Total vectors: {len(all_embeddings)}")

    upload_success = upload_faiss_to_ai_service(faiss_path, mapping_path)

    return {
        "status": "success",
        "count": len(all_embeddings),
        "index_path": str(faiss_path),
        "mapping_path": str(mapping_path),
        "upload_success": upload_success
    }