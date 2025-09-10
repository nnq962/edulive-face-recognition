// src/layouts/AppLayout.tsx
import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';

const { Header, Content, Footer } = Layout;

export default function AppLayout() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Header có thể thay bằng Menu hoặc logo công ty */}
      <Header style={{ color: '#fff', fontSize: 18, fontWeight: 600 }}>
        Hệ thống quản lý
      </Header>

      {/* Content có padding 10px như yêu cầu */}
      <Content style={{ padding: 10 }}>
        <Outlet /> {/* Nơi render các page con */}
      </Content>

      <Footer style={{ textAlign: 'center' }}>
        ©2025 Company Name - All rights reserved
      </Footer>
    </Layout>
  );
}