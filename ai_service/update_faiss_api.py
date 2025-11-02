# /máy_A/api_server.py
from fastapi import FastAPI, UploadFile, File, HTTPException, Header, Depends
import shutil
from utils import LOGGER
from config import paths, keys
from utils.verify_api_key import verify_update_faiss_key


app = FastAPI()


# Thư mục lưu face database
FACE_DB_DIR = paths.FAISS_DIR
FACE_DB_DIR.mkdir(parents=True, exist_ok=True)


# API Key để xác thực (nên để trong .env hoặc config)
# Generate bằng: python -c "import secrets; print(secrets.token_urlsafe(32))"
UPDATE_FAISS_API_KEY = keys.UPDATE_FAISS_API_KEY


@app.post("/api/update-faiss")
async def update_faiss(
    faiss_file: UploadFile = File(..., description="FAISS index file"),
    pkl_file: UploadFile = File(..., description="PKL metadata file"),
    _: bool = Depends(verify_update_faiss_key)
):
    """
    Update FAISS index and mapping file
    
    **Authentication:**
    - Requires X-API-Key header
    - API key phải match với server config
    """
    try:
        # Validate filenames
        if not faiss_file.filename.endswith('.faiss'):
            raise HTTPException(400, "Invalid FAISS file")
        
        if not pkl_file.filename.endswith('.pkl'):
            raise HTTPException(400, "Invalid PKL file")
        
        # Đọc content
        faiss_content = await faiss_file.read()
        pkl_content = await pkl_file.read()
        
        # Bỏ validation size (theo yêu cầu)
        # Vì đã có API key protection rồi
        
        # Backup files cũ (nếu có)
        faiss_path = FACE_DB_DIR / "face_index.faiss"
        pkl_path = FACE_DB_DIR / "faiss_mapping.pkl"
        
        if faiss_path.exists():
            shutil.copy(faiss_path, FACE_DB_DIR / "face_index.faiss.backup")
        
        if pkl_path.exists():
            shutil.copy(pkl_path, FACE_DB_DIR / "faiss_mapping.pkl.backup")
        
        # Lưu files mới
        faiss_path.write_bytes(faiss_content)
        pkl_path.write_bytes(pkl_content)
        
        LOGGER.info(f"Face DB synced: FAISS={len(faiss_content)}B, PKL={len(pkl_content)}B")
        
        return {
            "success": True,
            "message": "Face database synchronized successfully",
            "data": {
                "faiss_size": len(faiss_content),
                "pkl_size": len(pkl_content),
                "saved_at": FACE_DB_DIR.as_posix()
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        LOGGER.error(f"Sync face DB failed: {str(e)}")
        raise HTTPException(500, f"Sync failed: {str(e)}")


@app.get("/health")
async def health_check():
    """Health check endpoint - No authentication required"""
    return {"status": "ok", "service": "AI Service"}


@app.get("/api/info")
async def get_api_info(_: bool = Depends(verify_update_faiss_key)):
    """
    Get API server info (requires authentication)
    """
    faiss_path = FACE_DB_DIR / "face_index.faiss"
    pkl_path = FACE_DB_DIR / "faiss_mapping.pkl"
    
    return {
        "success": True,
        "data": {
            "faiss_exists": faiss_path.exists(),
            "pkl_exists": pkl_path.exists(),
            "faiss_size": faiss_path.stat().st_size if faiss_path.exists() else 0,
            "pkl_size": pkl_path.stat().st_size if pkl_path.exists() else 0,
            "faiss_dir": str(FACE_DB_DIR)
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
