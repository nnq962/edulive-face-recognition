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
import asyncio


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


async def rebuild_faiss_index(db: AsyncIOMotorDatabase, output_dir: Path = paths.FAISS_DIR):
    """
    Duyệt toàn bộ user, gom embeddings -> build lại FAISS index và mapping.pkl.

    Args:
        db: Mongo database instance
        output_dir: thư mục lưu index.faiss và mapping.pkl
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
            mapping.append({
                "_id": user_id,
                "full_name": full_name,
                "path": face.get("path")
            })

    if not all_embeddings:
        LOGGER.warning("No embeddings found in database.")
        return {"status": "empty", "count": 0}

    embeddings_np = np.vstack(all_embeddings).astype("float32")
    dim = embeddings_np.shape[1]

    # Tạo FAISS index
    LOGGER.info(f"Building FAISS index with {len(all_embeddings)} vectors (dim={dim})...")
    index = faiss.IndexFlatL2(dim)
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

    return {
        "status": "success",
        "count": len(all_embeddings),
        "index_path": str(faiss_path),
        "mapping_path": str(mapping_path),
    }