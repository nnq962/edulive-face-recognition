import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { message } from 'antd';
import { employeesApi } from '@/api';
import { useAuth } from '@/contexts/AuthContext';

// Interface cho User
export interface User {
    id: string;
    key: string;
    full_name: string;
    email?: string;
    role?: string;
    position?: string;
    department?: string;
    is_active?: boolean;
}

// Interface cho Context
interface UsersContextType {
    users: User[];
    loading: boolean;
    reload: () => Promise<void>;
}

// Tạo Context với giá trị mặc định
const UsersContext = createContext<UsersContextType>({
    users: [],
    loading: false,
    reload: async () => {},
});

// Provider Component
export const UsersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);

    const { user, loading: authLoading } = useAuth(); // Lấy trạng thái đăng nhập từ AuthContext

    // Hàm fetch danh sách users từ API với pagination
    const fetchUsers = useCallback(async () => {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) return; // Chưa có token thì không gọi API

            setLoading(true);
            
            let allUsers: User[] = [];
            let currentPage = 1;
            let hasMore = true;
            const limit = 100; // Giới hạn tối đa của API

            // Loop để fetch tất cả users qua nhiều pages
            while (hasMore) {
                const res = await employeesApi.getAllUsers({
                    page: currentPage,
                    limit: limit,
                    sort: 'full_name',
                    order: 'asc',
                    is_active: true, // Chỉ lấy users đang hoạt động
                });

                // Transform data sang format chuẩn
                const pageUsers = res.data.data.map((usr: any) => ({
                    id: usr.id,
                    key: usr.id,
                    full_name: usr.full_name,
                    email: usr.email,
                    role: usr.role,
                    position: usr.position,
                    department: usr.department,
                    is_active: usr.is_active,
                }));

                allUsers = [...allUsers, ...pageUsers];

                // Kiểm tra còn page tiếp theo không
                const meta = res.data.meta;
                hasMore = meta.has_next === true;
                currentPage++;

                // Safety check: Nếu đã fetch quá 50 pages (5000 users) thì dừng
                if (currentPage > 50) {
                    console.warn('Đã fetch 50 pages, dừng để tránh loop vô hạn');
                    break;
                }
            }

            setUsers(allUsers);
            console.log(`✅ Đã tải ${allUsers.length} nhân viên từ ${currentPage - 1} pages`);
        } catch (err: any) {
            if (user) { // Chỉ báo lỗi khi đang login
                console.error('Lỗi khi tải danh sách nhân viên:', err);
                message.error('Không thể tải danh sách nhân viên');
            }
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Fetch users khi user đã login và AuthContext load xong
    useEffect(() => {
        if (!authLoading && user) {
            fetchUsers();
        } else if (!user) {
            // Khi logout → clear data
            setUsers([]);
        }
    }, [user, authLoading, fetchUsers]);

    return (
        <UsersContext.Provider
            value={{
                users,
                loading,
                reload: fetchUsers,
            }}
        >
            {children}
        </UsersContext.Provider>
    );
};

// Custom hook để sử dụng UsersContext
export const useUsers = () => useContext(UsersContext);
