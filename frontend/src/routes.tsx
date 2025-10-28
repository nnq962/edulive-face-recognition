import React, { Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import Login from './pages/auth/Login'
import AttendanceTracking from './pages/attendance/AttendanceTracking'
import Settings from './pages/settings/Settings'
import ExportData from './pages/export/ExportData'
import EmployeeManagement from './pages/employees/EmployeeManagement'
import Approvals from './pages/approvals/Approvals'
import Vip from './pages/vip/Vip'
import ProtectedRoute from './components/ProtectedRoute'
// Lazy-load các trang con


// Bảo vệ route — nếu chưa login thì về trang /login
import { useAuth } from './contexts/AuthContext'
import { Spin } from 'antd'

const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth()
  
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
    )
  }
  
  // Chưa login → redirect về login
  if (!user) return <Navigate to="/login" replace />
  
  return <>{children}</>
}

export const router = createBrowserRouter([
  // Trang login
  {
    path: '/login',
    element: (
      <Suspense fallback={null}>
        <Login />
      </Suspense>
    ),
  },
  {
    path: '/vip',
    element: (
      <Suspense fallback={null}>
        <Vip />
      </Suspense>
    ),
  },
  // Các route chính (sau khi login)
  {
    path: '/',
    element: (
      <RequireAuth>
        <MainLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/attendance" replace /> },
      {
        path: 'attendance',
        element: (
          <ProtectedRoute allowedRoles={['user', 'admin', 'super_admin']}>
            <Suspense fallback={null}>
              <AttendanceTracking />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'employees',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
            <Suspense fallback={null}>
              <EmployeeManagement />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'settings',
        element: (
          <ProtectedRoute allowedRoles={['user', 'admin', 'super_admin']}>
            <Suspense fallback={null}>
              <Settings />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'export',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
            <Suspense fallback={null}>
              <ExportData />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      // {
      //   path: 'approvals',
      //   element: (
      //     <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
      //       <Suspense fallback={null}>
      //         <Approvals />
      //       </Suspense>
      //     </ProtectedRoute>
      //   ),
      // },
    ],
  },
  // Bất kỳ path nào khác → redirect về /
  { path: '*', element: <Navigate to="/" replace /> },
])