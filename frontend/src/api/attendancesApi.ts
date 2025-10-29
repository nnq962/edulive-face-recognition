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

    // Fetch ảnh chấm công dưới dạng blob
    getAttendanceImage: async (date: string, type: 'check_in' | 'check_out'): Promise<string> => {
        const response = await axiosClient.get(
            `/attendances/me/${date}/images/${type}`,
            { responseType: 'blob' }
        )
        return URL.createObjectURL(response.data)
    },
};

export default attendancesApi;