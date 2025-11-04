from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
from typing import Optional, Dict, Any
import xmlrpc.client
from utils.verify_api_key import verify_supervisor_status_key
from utils import LOGGER

# Khoi tao FastAPI app
app = FastAPI(
    title="Supervisor Status API",
    description="API to check Supervisor service status",
    version="1.0.0"
)

# Cau hinh CORS - cho phep tat ca cac origin goi API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Cho phep tat ca domain
    allow_credentials=True,
    allow_methods=["*"],  # Cho phep tat ca HTTP methods
    allow_headers=["*"],  # Cho phep tat ca headers
)

# Cau hinh Supervisor connection
SUPERVISOR_CONFIG = {
    "host": "localhost",
    "port": 19001,
    "username": "nnq",
    "password": "nnq",
    "service_name": "edulive-face-recognition-ai-service"
}


def get_supervisor_service_info(service_name: str) -> Dict[str, Any]:
    """
    Lay thong tin service tu Supervisor qua XML-RPC API
    
    Tham so:
        service_name: Ten service can kiem tra
        
    Tra ve:
        Dict chua thong tin service hoac None neu co loi
    """
    try:
        # Tao URL ket noi
        server_url = (
            f"http://{SUPERVISOR_CONFIG['username']}:{SUPERVISOR_CONFIG['password']}"
            f"@{SUPERVISOR_CONFIG['host']}:{SUPERVISOR_CONFIG['port']}/RPC2"
        )
        
        # Ket noi den Supervisor
        server = xmlrpc.client.ServerProxy(server_url)
        
        # Lay tat ca process info
        all_processes = server.supervisor.getAllProcessInfo()
        
        # Tim service can kiem tra
        for process in all_processes:
            if process['name'] == service_name:
                return {
                    "name": process['name'],
                    "state": process['statename'],
                    "state_code": process['state'],
                    "pid": process['pid'],
                    "uptime": process['now'] - process['start'] if process['start'] > 0 else 0,
                    "description": process['description'],
                    "spawnerr": process.get('spawnerr', ''),
                    "logfile": process.get('logfile', ''),
                    "stdout_logfile": process.get('stdout_logfile', ''),
                    "stderr_logfile": process.get('stderr_logfile', '')
                }
        
        return None
        
    except xmlrpc.client.ProtocolError as e:
        raise HTTPException(
            status_code=503,
            detail={
                "error": "Supervisor connection failed",
                "message": f"HTTP {e.errcode}: {e.errmsg}",
                "hint": "Check Supervisor credentials or connection"
            }
        )
    except ConnectionRefusedError:
        raise HTTPException(
            status_code=503,
            detail={
                "error": "Supervisor not reachable",
                "message": f"Cannot connect to {SUPERVISOR_CONFIG['host']}:{SUPERVISOR_CONFIG['port']}",
                "hint": "Check if Supervisor is running"
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Internal server error",
                "message": str(e)
            }
        )


@app.get("/api/supervisor/status")
async def get_service_status(
    service_name: Optional[str] = None,
    verified: bool = Depends(verify_supervisor_status_key)
):
    """
    Endpoint de kiem tra trang thai service Supervisor
    
    Tham so:
        service_name: Ten service can kiem tra (optional, mac dinh la edulive-face-recognition-ai-service)
        
    Header:
        X-API-Key: API key de xac thuc
        
    Response:
        JSON chua thong tin trang thai service
    """
    # Su dung service name mac dinh neu khong truyen vao
    target_service = service_name or SUPERVISOR_CONFIG['service_name']
    
    # Lay thong tin service
    service_info = get_supervisor_service_info(target_service)
    
    # Neu khong tim thay service
    if service_info is None:
        return {
            "success": False,
            "service_name": target_service,
            "status": "not_found",
            "message": f"Service '{target_service}' not found in Supervisor",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    # Xac dinh trang thai don gian
    state = service_info['state'].lower()
    is_running = state == 'running'
    
    # Tao response
    response = {
        "success": is_running,
        "service_name": service_info['name'],
        "status": state,
        "is_running": is_running,
        "details": {
            "pid": service_info['pid'],
            "uptime_seconds": service_info['uptime'],
            "description": service_info['description'],
            "state_code": service_info['state_code']
        },
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    # Them thong tin loi neu co
    if not is_running and service_info['spawnerr']:
        response['details']['error'] = service_info['spawnerr']
    
    # Them log files neu co
    if service_info.get('stdout_logfile'):
        response['details']['stdout_logfile'] = service_info['stdout_logfile']
    if service_info.get('stderr_logfile'):
        response['details']['stderr_logfile'] = service_info['stderr_logfile']
    
    return response


@app.get("/")
async def root():
    """
    Root endpoint - thong tin co ban ve API
    """
    return {
        "message": "Supervisor Status API",
        "version": "1.0.0",
        "endpoints": {
            "status": "/api/supervisor/status",
            "docs": "/docs",
            "redoc": "/redoc"
        },
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


# Chay server neu file nay duoc chay truc tiep
if __name__ == "__main__":
    import uvicorn
    
    LOGGER.info("=" * 60)
    LOGGER.info("Starting Supervisor Status API Server")
    LOGGER.info("=" * 60)
    LOGGER.info(f"Service monitoring: {SUPERVISOR_CONFIG['service_name']}")
    LOGGER.info(f"Supervisor: {SUPERVISOR_CONFIG['host']}:{SUPERVISOR_CONFIG['port']}")
    LOGGER.info(f"API Endpoint: http://localhost:8000/api/supervisor/status")
    LOGGER.info(f"API Docs: http://localhost:8000/docs")
    LOGGER.info("=" * 60)
    
    uvicorn.run(app, host="0.0.0.0", port=9622)