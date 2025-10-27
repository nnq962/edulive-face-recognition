import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './routes'
import { AuthProvider } from './contexts/AuthContext'
import { DepartmentsProvider } from './contexts/DepartmentsContext'
import 'antd/dist/reset.css'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <DepartmentsProvider>
        <RouterProvider router={router} />
      </DepartmentsProvider>
    </AuthProvider>
  </React.StrictMode>,
)
