import axiosClient from "./axiosClient";

export interface AddUserPayload {
    full_name: string;
    role: "user" | "admin" | "super_admin";
    position?: string;
    department?: string;
    telegram_username?: string;
  }

export interface UpdateUserPayload {
    full_name?: string;
    email?: string;
    role?: "user" | "admin" | "super_admin";
    position?: string;
    department?: string;
    telegram_username?: string;
    is_active?: boolean;
}

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

    // Thêm user mới
    addUser: (data: AddUserPayload) => axiosClient.post("/users", data),

    // Cập nhật user theo ID
    updateUser: (id: string, data: UpdateUserPayload) => axiosClient.put(`/users/${id}`, data),
};

export default employeesApi;
