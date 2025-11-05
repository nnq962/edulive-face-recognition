// src/api/supervisorstatusApi.ts
import axios from "axios";

// Khai báo biến môi trường
const SUPERVISOR_STATUS_API_URL = import.meta.env.VITE_SUPERVISOR_STATUS_API_URL;
const SUPERVISOR_STATUS_API_KEY = import.meta.env.VITE_SUPERVISOR_STATUS_API_KEY;

// Tạo axios instance riêng cho Supervisor Status API
const supervisorStatusClient = axios.create({
    baseURL: SUPERVISOR_STATUS_API_URL,
    headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-API-Key": SUPERVISOR_STATUS_API_KEY,
    },
});

const supervisorStatusApi = {
    // Lấy trạng thái service từ Supervisor
    getServiceStatus: (serviceName?: string) => {
        const params = serviceName ? { service_name: serviceName } : {};
        return supervisorStatusClient.get("/api/supervisor/status", { params });
    },
};

export default supervisorStatusApi;

