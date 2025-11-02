import axiosClient from "./axiosClient";

const departmentsApi = {
    // Lấy danh sách departments với pagination
    getDepartments: (params?: {
        page?: number;
        limit?: number;
        sort?: string;
        order?: 'asc' | 'desc';
        search?: string;
    }) => axiosClient.get("/departments/", { params }),

    // Tạo department mới
    createDepartment: (data: { name: string }) => 
        axiosClient.post("/departments/", data),

    // Cập nhật department
    updateDepartment: (data: { id: string; name: string }) => 
        axiosClient.put("/departments/", data),

    // Xóa department
    deleteDepartment: (data: { id: string }) => 
        axiosClient.delete("/departments/", { data }),
};

export default departmentsApi;
