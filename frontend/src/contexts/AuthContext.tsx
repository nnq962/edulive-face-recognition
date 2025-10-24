import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '@/api';

// Định nghĩa kiểu dữ liệu cho User
type UserRole = 'user' | 'admin' | 'super_admin';

interface User {
    id: string;
    username: string;
    email: string;
    role: UserRole;
    full_name?: string;
}

// Định nghĩa kiểu dữ liệu cho Context
interface AuthContextType {
    user: User | null;
    setUser: (user: User | null) => void;
    loading: boolean;
    setLoading: (loading: boolean) => void;
}

// Tạo Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider Component - Wrap toàn bộ app
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Fetch user info khi app load
    useEffect(() => {
        let isMounted = true; // Flag để tránh update state khi component unmount

        const fetchUserInfo = async () => {
            try {
                const token = localStorage.getItem('access_token');

                // Nếu không có token → không login → set loading = false
                if (!token) {
                    if (isMounted) setLoading(false);
                    return;
                }

                console.log('[AuthContext] Fetching user info...'); // ← Log để debug

                // Gọi API /auth/me để lấy thông tin user
                const response = await authApi.getMe();
                const userData = response.data.data; // Lấy data từ response

                // Lưu user vào Context (chỉ khi component còn mounted)
                if (isMounted) {
                    setUser({
                        id: userData.id,
                        username: userData.username,
                        email: userData.email,
                        role: userData.role,
                        full_name: userData.full_name,
                    });
                }
            } catch (error) {
                console.error('Lỗi khi lấy thông tin user:', error);
                // Nếu lỗi (token hết hạn, etc.) → xóa token và logout
                if (isMounted) {
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    setUser(null);
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchUserInfo();

        // Cleanup function - set flag khi component unmount
        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <AuthContext.Provider value={{ user, setUser, loading, setLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook để sử dụng Auth Context dễ dàng hơn
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth phải được sử dụng trong AuthProvider');
    }
    return context;
};