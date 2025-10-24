import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Spin } from 'antd';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[]; // Các role được phép truy cập
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  // Đang loading → hiển thị spinner
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <Spin size="large" />
      </div>
    );
  }

  // Chưa login → redirect về login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Kiểm tra role có được phép không
  if (!allowedRoles.includes(user.role)) {
    // Không có quyền → redirect về /attendance
    return <Navigate to="/attendance" replace />;
  }

  // Có quyền → cho vào trang
  return <>{children}</>;
};

export default ProtectedRoute;
