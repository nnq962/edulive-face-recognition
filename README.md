# Face Recognition

Hệ thống điểm danh khuôn mặt thời gian thực sử dụng AI, được thiết kế cho môi trường giáo dục. Hệ thống tích hợp nhận diện khuôn mặt (InsightFace + FAISS), backend API (FastAPI), và giao diện quản lý (React + Ant Design).

## 📋 Tổng quan kiến trúc

```
face-recognition/
├── ai_service/          # Dịch vụ AI: phát hiện & nhận diện khuôn mặt (InsightFace, FAISS)
├── backend/             # Backend API (FastAPI + Uvicorn)
│   ├── routes/          # API endpoints (user, auth, department, attendance, telegram)
│   ├── models/          # Database models
│   ├── schemas/         # Pydantic schemas
│   └── services/        # Business logic
├── frontend/            # Giao diện quản lý (React + TypeScript + Ant Design + Vite)
├── config/              # Cấu hình hệ thống (database, features, paths, network, keys)
├── supervisor/          # Cấu hình Supervisor (quản lý tiến trình trên server)
├── utils/               # Tiện ích dùng chung (logger, time_helper, verify_api_key)
└── audio_notifications/ # File âm thanh thông báo
```

### Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| **AI / Face Recognition** | InsightFace (RetinaFace + ArcFace), FAISS-GPU, ONNX Runtime GPU, MediaPipe |
| **Backend** | Python 3.10, FastAPI, Uvicorn, Pydantic |
| **Database** | MongoDB (Motor - async driver), MySQL (SQLAlchemy + aiomysql) |
| **Frontend** | React 18, TypeScript, Ant Design 5, Vite |
| **Deep Learning** | PyTorch 2.2, CUDA 12.1 |
| **Process Management** | Supervisor |

---

## ⚙️ Yêu cầu hệ thống

- **OS**: Linux (Ubuntu khuyến nghị)
- **Python**: 3.10
- **GPU**: NVIDIA GPU với CUDA 12.1 (cho inference AI và FAISS-GPU)
- **Conda**: Miniconda hoặc Anaconda
- **Node.js**: >= 18 (cho frontend)
- **Database**: MongoDB, MySQL

---

## 🚀 Hướng dẫn cài đặt

### 1. Clone repository

```bash
git clone <repository-url>
cd face-recognition
```

### 2. Tạo môi trường Conda

```bash
conda env create -f environment.yml
conda activate face-recognition
```

> **Lưu ý**: File `environment.yml` bao gồm tất cả các dependencies Python cần thiết (PyTorch, InsightFace, FastAPI, Motor, SQLAlchemy, v.v.). Quá trình cài đặt có thể mất vài phút do các thư viện GPU.

### 3. Cấu hình biến môi trường

Sao chép file `.env.example` và điền thông tin:

```bash
cp .env.example .env
```

Mở file `.env` và cấu hình các biến sau:

```ini
# ── MongoDB ──────────────────────────────────────────────
MONGODB_USER=<username>
MONGODB_PASSWORD=<password>
MONGODB_HOST=<host>            # VD: localhost
MONGODB_PORT=<port>            # VD: 27017
MONGODB_NAME=<database_name>
MONGODB_AUTHSOURCE=<auth_db>   # VD: admin

# ── MySQL ────────────────────────────────────────────────
MYSQL_USER=<username>
MYSQL_PASSWORD=<password>
MYSQL_HOST=<host>              # VD: localhost
MYSQL_PORT=<port>              # VD: 3306
MYSQL_DATABASE=<database_name>

# ── AI Model URLs ───────────────────────────────────────
MODEL_RETINAFACE_URL=<url_to_retinaface_model>
MODEL_ARCFACE_URL=<url_to_arcface_model>

# ── JWT Authentication ──────────────────────────────────
JWT_SECRET_KEY=<your_secret_key>
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_MINUTES=10080

# ── Data Storage ────────────────────────────────────────
USERS_DATA_PATH=<path_to_users_data>

# ── External API (Attendance sync) ─────────────────────
UPDATE_ATTENDANCE_API_KEY=<api_key>
UPDATE_ATTENDANCE_API_URL=<api_url>

# ── External API (FAISS sync) ──────────────────────────
UPDATE_FAISS_API_KEY=<api_key>
UPDATE_FAISS_API_URL=<api_url>

# ── Supervisor Status ──────────────────────────────────
SUPERVISOR_STATUS_API_KEY=<api_key>
SUPERVISOR_STATUS_API_URL=<api_url>

# ── Telegram Notifications ─────────────────────────────
TELEGRAM_BOT_TOKEN=<bot_token>
```

### 4. Cài đặt Frontend

```bash
cd frontend
npm install
cd ..
```

### 5. Build Frontend (Production)

```bash
cd frontend
npm run build
cd ..
```

---

## ▶️ Chạy ứng dụng

### Chạy Backend API

```bash
conda activate face-recognition
uvicorn backend.main:app --host 0.0.0.0 --port 9620
```

Backend sẽ khởi động tại `http://localhost:9620`. Truy cập Swagger UI tại `http://localhost:9620/docs`.

### Chạy AI Service (Face Recognition)

```bash
conda activate face-recognition
python -m ai_service.main
```

> **Lưu ý**: Cấu hình nguồn video (camera IP/RTSP) trong file `ai_service/device.txt`. Mỗi dòng là một URL hoặc device ID.

### Chạy Frontend (Development)

```bash
cd frontend
npm run dev
```

Frontend sẽ chạy tại `http://localhost:5173`.

---

## 🖥️ Triển khai với Supervisor (Production)

Các file cấu hình Supervisor nằm trong thư mục `supervisor/`. Copy vào thư mục cấu hình Supervisor:

```bash
sudo cp supervisor/*.txt /etc/supervisor/conf.d/
```

> **Quan trọng**: Sửa lại các đường dẫn `directory`, `command`, `user` và `environment` trong các file `.txt` cho phù hợp với môi trường triển khai.

Sau đó reload Supervisor:

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start face-recognition-app
```

Kiểm tra trạng thái:

```bash
sudo supervisorctl status
```

---

## 📁 API Endpoints chính

| Nhóm | Prefix | Mô tả |
|---|---|---|
| **Auth** | `/auth` | Đăng nhập, đăng ký, refresh token (JWT) |
| **User** | `/users` | Quản lý người dùng, đăng ký khuôn mặt |
| **Department** | `/departments` | Quản lý phòng ban |
| **Attendance** | `/attendance` | Điểm danh, báo cáo, xuất Excel |
| **Telegram** | `/telegram` | Webhook & thông báo Telegram |

---

## 🔧 Cấu hình AI Service

Các tham số AI được cấu hình trong `config/features.py`:

| Tham số | Mặc định | Mô tả |
|---|---|---|
| `ENABLE_FACE_DETECTION` | `True` | Bật/tắt phát hiện khuôn mặt |
| `FACE_DETECTION_THRESHOLD` | `0.7` | Ngưỡng tin cậy phát hiện |
| `ENABLE_FACE_RECOGNITION` | `True` | Bật/tắt nhận diện khuôn mặt |
| `FACE_RECOGNITION_THRESHOLD` | `0.54` | Ngưỡng tin cậy nhận diện |
| `ENABLE_FACE_DATA_SAVE` | `True` | Lưu dữ liệu khuôn mặt phát hiện được |
| `FACE_DATA_SAVE_INTERVAL_SEC` | `1` | Khoảng cách lưu dữ liệu (giây) |
| `SOURCE` | `ai_service/device.txt` | File chứa danh sách nguồn video |

---

## 📝 Ghi chú

- Backend tự động chốt checkout sau **17:30** (giờ Việt Nam) mỗi phút cho các bản ghi chưa checkout.
- Hệ thống hỗ trợ nhiều camera cùng lúc qua file `device.txt`.
- FAISS index được sử dụng để tìm kiếm vector khuôn mặt nhanh trên GPU.
- Logs được ghi qua module `utils/logger.py` với `colorlog`.
