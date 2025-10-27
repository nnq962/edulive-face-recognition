import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { message } from 'antd';
import { departmentsApi } from '@/api';
import { useAuth } from '@/contexts/AuthContext'; // 👈 thêm dòng này

export interface Department {
    id: string;
    key: string;
    name: string;
}

interface DepartmentsContextType {
    departments: Department[];
    loading: boolean;
    reload: () => Promise<void>;
}

const DepartmentsContext = createContext<DepartmentsContextType>({
    departments: [],
    loading: false,
    reload: async () => {},
});

export const DepartmentsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(false);

    const { user, loading: authLoading } = useAuth(); // 👈 lấy trạng thái đăng nhập từ AuthContext

    const fetchDepartments = useCallback(async () => {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) return; // 👈 chưa có token thì không gọi API

            setLoading(true);
            const res = await departmentsApi.getDepartments({
                page: 1,
                limit: 100,
                sort: 'name',
                order: 'asc',
            });

            const data = res.data.data.map((dept: any) => ({
                id: dept.id,
                key: dept.id,
                name: dept.name,
            }));

            setDepartments(data);
        } catch (err: any) {
            if (user) { // 👈 chỉ báo lỗi khi đang login
                console.error('Lỗi khi tải danh sách phòng ban:', err);
                message.error('Không thể tải danh sách phòng ban');
            }
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        // 👇 Chỉ fetch khi user đã login và AuthContext load xong
        if (!authLoading && user) {
            fetchDepartments();
        } else if (!user) {
            // 👇 Khi logout → clear data
            setDepartments([]);
        }
    }, [user, authLoading, fetchDepartments]);

    return (
        <DepartmentsContext.Provider
            value={{
                departments,
                loading,
                reload: fetchDepartments,
            }}
        >
            {children}
        </DepartmentsContext.Provider>
    );
};

export const useDepartments = () => useContext(DepartmentsContext);