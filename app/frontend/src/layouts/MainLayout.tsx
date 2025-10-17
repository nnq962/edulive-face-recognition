import React, { useState } from 'react';
import {
    AppstoreOutlined,
    UserOutlined,
    VideoCameraOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    CheckCircleOutlined,
    SettingOutlined,
    DatabaseOutlined
} from '@ant-design/icons';

import { Layout, Menu } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

const { Content, Sider } = Layout;

const menuItems = [
    { key: '/attendance', icon: <VideoCameraOutlined />, label: 'Chấm công' },
    { key: '/export', icon: <DatabaseOutlined />, label: 'Dữ liệu' },
    { key: '/approvals', icon: <CheckCircleOutlined />, label: 'Phê duyệt' },
    { key: '/employees', icon: <UserOutlined />, label: 'Nhân sự' },
    { key: '/settings', icon: <SettingOutlined />, label: 'Cài đặt' },
];

const AppLayout: React.FC = () => {
    

    const [collapsed, setCollapsed] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            const savedCollapsed = localStorage.getItem('siderCollapsed')
            if (savedCollapsed !== null) {
                return savedCollapsed === 'true'
            }
            return window.innerWidth < 992
        }
        return false
    })
    const location = useLocation()
    const navigate = useNavigate()
    const basePath = `/${(location.pathname.split('/')[1] || 'attendance')}`

    const handleCollapse = (value: boolean) => {
        setCollapsed(value)
        if (typeof window !== 'undefined') {
            localStorage.setItem('siderCollapsed', String(value))
        }
    }

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider
                width={235}
                collapsible
                collapsed={collapsed}
                onCollapse={handleCollapse}
                theme="light"
                style={{
                    overflow: 'auto',
                    height: '100vh',
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    boxShadow: '0 1px 6px rgba(0,0,0,0.08)'
                }}
                trigger={
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            color: '#1677ff',
                            background: 'rgba(22,119,255,0.08)'
                        }}
                    >
                        {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                    </div>
                }
            >

                <div
                    style={{
                        height: 56,
                        margin: '12px',                     // vẫn có khoảng cách
                        padding: '0 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        gap: collapsed ? 0 : 8,
                        color: '#111',
                        fontWeight: 600,
                        fontSize: 16,
                        borderRadius: 8,
                        background: 'rgba(0,0,0,0.04)',
                        border: '1px solid rgba(0,0,0,0.06)',
                        width: 'calc(100% - 24px)',         // 👈 KHÔNG vượt quá Sider (100% - 2*margin)
                        boxSizing: 'border-box',
                        overflow: 'hidden',                 // 👈 chặn tràn khi đang trượt
                    }}
                >
                    <AppstoreOutlined style={{ fontSize: collapsed ? 20 : 18 }} />
                    {!collapsed && (
                        <span
                            style={{
                                flex: 1,
                                minWidth: 0,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}
                        >
                            Hệ thống chấm công
                        </span>
                    )}
                </div>

                <Menu
                    theme="light"
                    mode="inline"
                    selectedKeys={[basePath]}
                    items={menuItems}
                    onClick={({ key }) => navigate(String(key))}
                />
            </Sider>
            <Layout style={{ marginLeft: collapsed ? 80 : 235 }}>
                <Content style={{ margin: '16px' }}>
                    <div
                        style={{
                            padding: 0,
                            minHeight: 'auto',
                            background: 'transparent',
                            borderRadius: 0,
                        }}
                    >
                        <Outlet /> {/* 👈 render nội dung trang con ở đây */}
                    </div>
                </Content>
            </Layout>
        </Layout>
    );
};

export default AppLayout;