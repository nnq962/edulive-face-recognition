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
// Lazy-load các trang con


// Bảo vệ route — nếu chưa login thì về trang /login
const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to="/login" replace />
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
          <Suspense fallback={null}>
            <AttendanceTracking />
          </Suspense>
        ),
      },
      {
        path: 'employees',
        element: (
          <Suspense fallback={null}>
            <EmployeeManagement />
          </Suspense>
        ),
      },
      {
        path: 'settings',
        element: (
          <Suspense fallback={null}>
            <Settings />
          </Suspense>
        ),
      },
      {
        path: 'export',
        element: (
          <Suspense fallback={null}>
            <ExportData />
          </Suspense>
        ),
      },
      {
        path: 'approvals',
        element: (
          <Suspense fallback={null}>
            <Approvals />
          </Suspense>
        ),
      },
    ],
  },
  // Bất kỳ path nào khác → redirect về /
  { path: '*', element: <Navigate to="/" replace /> },
])