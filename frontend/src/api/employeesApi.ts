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

    // Lấy danh sách ảnh khuôn mặt của user
    getUserFaces: (user_id: string) => axiosClient.get(`/users/${user_id}/faces`),

    // Xem ảnh khuôn mặt của user (trả về blob)
    viewUserFace: (user_id: string, filename: string) => 
        axiosClient.get(`/users/${user_id}/faces/${filename}`, {
            responseType: 'blob', // Quan trọng: để nhận binary data
        }),

    // Xóa ảnh khuôn mặt của user
    deleteUserFace: (user_id: string, filename: string) => axiosClient.delete(`/users/${user_id}/faces/${filename}`),

    // Upload ảnh khuôn mặt của user
    uploadUserFaces: (user_id: string, files: File[]) => {
        console.log('uploadUserFaces called with:', {
            user_id,
            filesCount: files.length,
            files: files.map(f => ({
                name: f.name,
                type: f.type,
                size: f.size,
                lastModified: f.lastModified
            }))
        });

        const formData = new FormData();
        
        // Thêm từng file vào FormData
        files.forEach((file, index) => {
            console.log(`Adding file ${index}:`, file.name, file.type);
            formData.append('files', file, file.name);
        });

        // Log FormData entries
        console.log('FormData entries:');
        for (let pair of formData.entries()) {
            console.log(pair[0], pair[1]);
        }

        return axiosClient.post(`/users/${user_id}/faces`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },
};

export default employeesApi;
