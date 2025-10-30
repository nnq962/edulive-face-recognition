import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './routes'
import { AuthProvider } from './contexts/AuthContext'
import { DepartmentsProvider } from './contexts/DepartmentsContext'
import { UsersProvider } from './contexts/UsersContext'
import 'antd/dist/reset.css'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <DepartmentsProvider>
        <UsersProvider>
          <RouterProvider router={router} />
        </UsersProvider>
      </DepartmentsProvider>
    </AuthProvider>
  </React.StrictMode>,
)
