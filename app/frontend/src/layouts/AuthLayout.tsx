// src/layouts/AuthLayout.tsx
import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';

const { Content } = Layout;

export default function AuthLayout() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content
        style={{
          display: 'grid',
          placeItems: 'center', // căn giữa ngang+dọc
          padding: 0,           // KHÔNG 5px cho trang login
          background: '#f5f5f5' // tuỳ, thích thì giữ
        }}
      >
        <Outlet />
      </Content>
    </Layout>
  );
}