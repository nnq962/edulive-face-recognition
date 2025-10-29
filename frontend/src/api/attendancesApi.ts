// src/api/axiosClient.ts

import axiosClient from "./axiosClient";

const attendancesApi = {
    getMyAttendances: (params?: {
        start_date?: string;
        end_date?: string;
        page?: number;
        limit?: number;
        sort?: string;
        order?: 'asc' | 'desc';
    }) => axiosClient.get("/attendances/me", { params }),
};

export default attendancesApi;