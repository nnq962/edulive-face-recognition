// src/api/axiosClient.ts
import axios from "axios";

const axiosClient = axios.create({
    baseURL: "https://cc.edulive.net/api",
    headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
    },
});

// Biến để tránh refresh token nhiều lần cùng lúc
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// Request Interceptor - Thêm token vào header
axiosClient.interceptors.request.use((config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response Interceptor - Xử lý tự động refresh token
axiosClient.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // ✅ QUAN TRỌNG: Không xử lý refresh token cho request login
        if (originalRequest.url?.includes('/auth/login')) {
            return Promise.reject(error);
        }

        // Kiểm tra nếu lỗi 401 và chưa retry
        if (error.response?.status === 401 && !originalRequest._retry) {
            // Nếu đang refresh token thì đợi
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return axiosClient(originalRequest);
                    })
                    .catch((err) => {
                        return Promise.reject(err);
                    });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const refreshToken = localStorage.getItem("refresh_token");

            // Nếu không có refresh_token → logout
            if (!refreshToken) {
                isRefreshing = false;
                localStorage.removeItem("access_token");
                localStorage.removeItem("refresh_token");
                // ✅ Chỉ redirect nếu KHÔNG phải đang ở trang login
                if (!window.location.pathname.includes('/login')) {
                    window.location.href = "/login";
                }
                return Promise.reject(error);
            }

            try {
                // Gọi API refresh token
                const refreshUrl = `${axiosClient.defaults.baseURL}/auth/refresh`;
                const response = await axios.post(
                    refreshUrl,
                    { refresh_token: refreshToken },
                    {
                        headers: {
                            "Content-Type": "application/json",
                            Accept: "application/json",
                        },
                    }
                );

                const newAccessToken = response.data.data.access_token;

                // Lưu access_token mới vào localStorage
                localStorage.setItem("access_token", newAccessToken);

                // Cập nhật header cho request ban đầu
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

                // Xử lý các request đang chờ
                processQueue(null, newAccessToken);

                isRefreshing = false;

                // Retry request ban đầu với token mới
                return axiosClient(originalRequest);
            } catch (refreshError) {
                // Nếu refresh token cũng hết hạn → logout
                processQueue(refreshError, null);
                isRefreshing = false;
                localStorage.removeItem("access_token");
                localStorage.removeItem("refresh_token");
                // ✅ Chỉ redirect nếu KHÔNG phải đang ở trang login
                if (!window.location.pathname.includes('/login')) {
                    window.location.href = "/login";
                }
                return Promise.reject(refreshError);
            }
        }

        // Nếu không phải lỗi 401 → trả về lỗi bình thường
        return Promise.reject(error);
    }
);

export default axiosClient;