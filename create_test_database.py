# scripts/bootstrap_faiss_dummy.py
import os
import pickle
from pathlib import Path
import numpy as np
import faiss

from utils import LOGGER
from config import paths  # dùng paths.FAISS_FILE, paths.FAISS_MAPPING_FILE, paths.FAISS_DIR, paths.MODEL_DIR

# ==== cấu hình dummy ====
NUM_USERS = 5
EMBED_DIM = 512
SEED = 42

# Danh sách user dummy (tuỳ bạn đổi tên/ID)
DUMMY_USERS = [
    {"user_id": "u001", "name": "Alice"},
    {"user_id": "u002", "name": "Bob"},
    {"user_id": "u003", "name": "Charlie"},
    {"user_id": "u004", "name": "Diana"},
    {"user_id": "u005", "name": "Ethan"},
]


def l2_normalize(x: np.ndarray, eps: float = 1e-12) -> np.ndarray:
    # normalize theo L2 để xài IndexFlatIP như cosine similarity
    norms = np.linalg.norm(x, axis=1, keepdims=True)
    return x / np.maximum(norms, eps)


def main():
    # 1) đảm bảo thư mục tồn tại
    paths.FAISS_DIR.mkdir(parents=True, exist_ok=True)
    LOGGER.info(f"FAISS_DIR: {paths.FAISS_DIR}")
    LOGGER.info(f"FAISS_FILE: {paths.FAISS_FILE_PATH}")
    LOGGER.info(f"FAISS_MAPPING_FILE: {paths.FAISS_MAPPING_FILE_PATH}")

    # 2) sinh embeddings ngẫu nhiên + normalize
    assert len(DUMMY_USERS) == NUM_USERS, "Cập nhật NUM_USERS cho khớp DUMMY_USERS"
    rng = np.random.default_rng(SEED)
    embs = rng.standard_normal((NUM_USERS, EMBED_DIM)).astype(np.float32)
    embs = l2_normalize(embs).astype(np.float32)  # cosine-ready

    # 3) build FAISS index (Inner Product)
    index = faiss.IndexFlatIP(EMBED_DIM)
    index.add(embs)
    faiss.write_index(index, str(paths.FAISS_FILE_PATH))
    LOGGER.info(f"✅ Wrote FAISS index to: {paths.FAISS_FILE_PATH}")

    # 4) build mapping index -> user info
    id_mapping = {i: {"user_id": u["user_id"], "name": u["name"]} for i, u in enumerate(DUMMY_USERS)}
    with open(paths.FAISS_MAPPING_FILE_PATH, "wb") as f:
        pickle.dump(id_mapping, f)
    LOGGER.info(f"✅ Wrote mapping to: {paths.FAISS_MAPPING_FILE_PATH}")
    LOGGER.info(f"Done. Users: {[u['user_id'] for u in DUMMY_USERS]}")


if __name__ == "__main__":
    main()