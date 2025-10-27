import axiosClient from "./axiosClient";

const employeesApi = {
    // Lấy danh sách users với pagination và filters
    getAllUsers: (params?: {
        page?: number;
        limit?: number;
        sort?: string;
        order?: 'asc' | 'desc';
        id?: string;
        role?: 'user' | 'admin' | 'super_admin';
        position?: string;
        department?: string;
        is_active?: boolean;
        search?: string;
    }) => axiosClient.get("/users", { params }),

    // Xóa user theo ID
    deleteUser: (id: string) => axiosClient.delete(`/users/${id}`),
};

export default employeesApi;
