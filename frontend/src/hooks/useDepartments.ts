import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { departmentsApi } from '@/api';

// Kiểu dữ liệu của một phòng ban
export interface Department {
    key: string;
    id: string;
    name: string;
}

/**
 * Hook dùng để lấy danh sách phòng ban từ API và quản lý state
 * 
 * @param autoLoad - Nếu true thì tự động fetch khi component mount (mặc định: true)
 * 
 * @returns {
 *  departments: danh sách phòng ban,
 *  loading: trạng thái loading,
 *  reload: hàm gọi lại API để cập nhật danh sách
 * }
 */
export const useDepartments = (autoLoad: boolean = true) => {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    const fetchDepartments = useCallback(async () => {
        try {
            setLoading(true);

            const response = await departmentsApi.getDepartments({
                page: 1,
                limit: 100,
                sort: 'name',
                order: 'asc',
            });

            const data = response.data.data.map((dept: any) => ({
                key: dept.id,
                id: dept.id,
                name: dept.name,
            })) as Department[];

            setDepartments(data);
        } catch (error: any) {
            console.error('Lỗi khi tải danh sách phòng ban:', error);
            message.error(error.response?.data?.detail || 'Lỗi khi tải danh sách phòng ban');
            setDepartments([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (autoLoad) fetchDepartments();
    }, [autoLoad, fetchDepartments]);

    return {
        departments,
        loading,
        reload: fetchDepartments,
    };
};