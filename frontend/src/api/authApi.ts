// src/api/authApi.ts
import axiosClient from "./axiosClient";

const authApi = {
    // 🔹 Login
    login: (data: {
        username_or_email: string;
        password: string;
        remember_me: boolean;
    }) => axiosClient.post("/auth/login", data),

    // 🔹 Get current user (/auth/me)
    getMe: () => axiosClient.get("/auth/me"),

    // 🔹 Refresh token
    refreshToken: (data: { refresh_token: string }) =>
        axiosClient.post("/auth/refresh", data),

};

export default authApi;