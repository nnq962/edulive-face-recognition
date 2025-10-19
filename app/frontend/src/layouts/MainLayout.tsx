import React from 'react';
import { Layout, Badge, Popover, Tabs, Drawer, Tooltip } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
    MenuOutlined,
    VideoCameraOutlined,
    DatabaseOutlined,
    CheckCircleOutlined,
    UserOutlined,
    SettingOutlined,
    MailOutlined,
    ScheduleOutlined
} from '@ant-design/icons';
import LogoutIcon from '../assets/icons/logout.svg';

const { Content } = Layout;

// Map routes với icon và title
const routeConfig: Record<string, { icon: React.ReactNode; title: string }> = {
    '/attendance': { icon: <VideoCameraOutlined />, title: 'Chấm công' },
    '/export': { icon: <DatabaseOutlined />, title: 'Dữ liệu' },
    '/approvals': { icon: <CheckCircleOutlined />, title: 'Phê duyệt' },
    '/employees': { icon: <UserOutlined />, title: 'Nhân sự' },
    '/settings': { icon: <SettingOutlined />, title: 'Cài đặt' },
};

const MainLayout: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const currentPath = `/${location.pathname.split('/')[1] || 'attendance'}`;
    const currentRoute = routeConfig[currentPath] || { icon: <VideoCameraOutlined />, title: 'Chấm công' };
    const [sidebarCollapsed, setSidebarCollapsed] = React.useState(() => {
        const saved = localStorage.getItem('sidebarCollapsed');
        if (saved !== null) {
            return JSON.parse(saved);
        }
        // Mặc định: mobile đóng, desktop mở
        return window.innerWidth < 768;
    });

    const [isMobile, setIsMobile] = React.useState(() => window.innerWidth < 768);
    const [notificationOpen, setNotificationOpen] = React.useState(false);

    // Mock số lượng phê duyệt
    const [pendingApprovalsCount] = React.useState(97);

    // Mock trạng thái máy chấm công
    const [deviceStatus] = React.useState({
        isOnline: true, // true = online (xanh), false = offline (đỏ)
        lastUpdate: '14:30', // Thời gian từ API
    });

    // Mock data
    const mockNotifications = [
        {
            id: 1,
            title: 'Chấm công thành công',
            message: 'Bạn đã chấm công vào lúc 08:30 ngày 18/10/2025',
            time: '2 giờ trước',
            read: true,
        },
        {
            id: 2,
            title: 'Yêu cầu nghỉ phép được duyệt',
            message: 'Yêu cầu nghỉ phép ngày 20/10/2025 của bạn đã được phê duyệt',
            time: '5 giờ trước',
            read: true,
        },
    ];

    // Detect screen size
    React.useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Lưu trạng thái sidebar vào localStorage
    React.useEffect(() => {
        localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed));
    }, [sidebarCollapsed]);

    // Ngăn overscroll cho body
    React.useEffect(() => {
        document.body.style.overscrollBehavior = 'none';
        document.documentElement.style.overscrollBehavior = 'none';
        return () => {
            document.body.style.overscrollBehavior = '';
            document.documentElement.style.overscrollBehavior = '';
        };
    }, []);

    // Notification content
    const NotificationContent = () => {
        const contentStyle = {
            width: '100%',
            maxHeight: '400px',
            overflowY: 'auto' as const,
        };

        const items = [
            {
                key: 'all',
                label: 'Tất cả',
                children: (
                    <div style={contentStyle}>
                        {mockNotifications.map(notif => (
                            <div
                                key={notif.id}
                                style={{
                                    padding: '12px',
                                    borderBottom: '1px solid #f0f0f0',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#fafafa'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                <div style={{ fontWeight: 600, marginBottom: '4px' }}>{notif.title}</div>
                                <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>{notif.message}</div>
                                <div style={{ fontSize: '12px', color: '#999' }}>{notif.time}</div>
                            </div>
                        ))}
                    </div>
                ),
            },
            {
                key: 'unread',
                label: 'Chưa đọc',
                children: (
                    <div style={{ width: '100%', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                        Không có thông báo chưa đọc
                    </div>
                ),
            },
            {
                key: 'read',
                label: 'Đã đọc',
                children: (
                    <div style={contentStyle}>
                        {mockNotifications.map(notif => (
                            <div
                                key={notif.id}
                                style={{
                                    padding: '12px',
                                    borderBottom: '1px solid #f0f0f0',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#fafafa'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                <div style={{ fontWeight: 600, marginBottom: '4px' }}>{notif.title}</div>
                                <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>{notif.message}</div>
                                <div style={{ fontSize: '12px', color: '#999' }}>{notif.time}</div>
                            </div>
                        ))}
                    </div>
                ),
            },
        ];

        return <Tabs defaultActiveKey="all" items={items} />;
    };

    return (
        <div style={{
            display: 'flex',
            minHeight: '100vh',
            fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            overflow: 'hidden',
            height: '100vh',
        }}>
            {/* Sidebar */}
            <aside
                style={{
                    width: '250px',
                    position: 'fixed',
                    left: sidebarCollapsed ? '-250px' : '0',
                    top: 0,
                    bottom: 0,
                    background: '#f9f8f7',
                    borderRight: '1px solid rgba(0, 0, 0, 0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'left 0.4s ease',
                }}
            >
                {/* Sidebar Header */}
                <div
                    style={{
                        height: '44px',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 16px',
                        paddingLeft: '16px',
                        borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
                        gap: '8px',
                    }}
                >
                    <ScheduleOutlined style={{ fontSize: '16px', color: '#000' }} />
                    <span style={{ fontSize: '16px', fontWeight: 700, color: '#000' }}>Hệ thống chấm công</span>
                </div>

                {/* Sidebar Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
                    {Object.entries(routeConfig).map(([path, config]) => (
                        <div
                            key={path}
                            onClick={() => {
                                navigate(path);
                                if (isMobile) {
                                    setSidebarCollapsed(true);
                                }
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '8px',
                                padding: '10px 12px',
                                paddingLeft: '8px',
                                paddingRight: '8px',
                                marginLeft: '8px',
                                marginRight: '8px',
                                marginBottom: '4px',
                                cursor: 'pointer',
                                borderRadius: '6px',
                                background: currentPath === path ? '#E6F4FF' : 'transparent',
                                color: '#000',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                                if (currentPath !== path) {
                                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.04)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (currentPath !== path) {
                                    e.currentTarget.style.background = 'transparent';
                                }
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '16px' }}>{config.icon}</span>
                                <span style={{ fontSize: '16px', fontWeight: currentPath === path ? 600 : 500 }}>
                                    {config.title}
                                </span>
                            </div>
                            {path === '/approvals' && pendingApprovalsCount > 0 && (
                                <Badge
                                    count={pendingApprovalsCount}
                                    overflowCount={99}
                                    style={{
                                        backgroundColor: '#ff4d4f',
                                    }}
                                />
                            )}
                        </div>
                    ))}
                </div>
            </aside>

            {/* Main Content Area */}
            <div style={{
                position: 'fixed',
                left: sidebarCollapsed ? '0' : '250px',
                width: isMobile ? '100vw' : undefined,
                right: isMobile ? undefined : 0,
                top: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                transition: 'left 0.4s ease',
                overflow: 'hidden',
            }}>
                {/* Header */}
                <header
                    style={{
                        height: '44px',
                        background: '#fff',
                        borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 8px',
                        position: 'relative',
                        zIndex: 10,
                        justifyContent: 'space-between',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div
                            style={{
                                width: '32px',
                                height: '32px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                transition: 'background 0.2s',
                                background: !sidebarCollapsed ? '#E6F4FF' : 'transparent',
                            }}
                            onMouseEnter={(e) => {
                                if (sidebarCollapsed) {
                                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.06)';
                                } else {
                                    e.currentTarget.style.background = '#BAE0FF';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (sidebarCollapsed) {
                                    e.currentTarget.style.background = 'transparent';
                                } else {
                                    e.currentTarget.style.background = '#E6F4FF';
                                }
                            }}
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        >
                            <MenuOutlined
                                style={{
                                    cursor: 'pointer',
                                    color: '#000'
                                }}
                            />
                        </div>
                        <div style={{ marginLeft: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '16px', color: '#000' }}>{currentRoute.icon}</span>
                            <span style={{ fontSize: '16px', fontWeight: 700, color: '#000' }}>{currentRoute.title}</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0px' }}>
                        {/* Active Dot with Ripple Effect */}
                        <Tooltip
                            title={deviceStatus.isOnline
                                ? `MCC đang hoạt động (${deviceStatus.lastUpdate})`
                                : `MCC không hoạt động (${deviceStatus.lastUpdate})`
                            }
                            placement="left"
                            arrow={false}
                        >
                            <div
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '4px',
                                    position: 'relative',
                                }}
                            >
                                <div
                                    style={{
                                        position: 'relative',
                                        width: '8px',
                                        height: '8px',
                                    }}
                                >
                                    <div
                                        style={{
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            background: deviceStatus.isOnline ? '#52c41a' : '#ff4d4f',
                                            position: 'absolute',
                                        }}
                                    />
                                    <div
                                        style={{
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            background: deviceStatus.isOnline ? '#52c41a' : '#ff4d4f',
                                            position: 'absolute',
                                            animation: 'ripple 1s cubic-bezier(0, 0, 0.2, 1) infinite',
                                        }}
                                    />
                                </div>
                            </div>
                        </Tooltip>
                        <style>{`
                            @keyframes ripple {
                                0% {
                                    transform: scale(1);
                                    opacity: 1;
                                }
                                100% {
                                    transform: scale(3);
                                    opacity: 0;
                                }
                            }
                        `}</style>
                        {isMobile ? (
                            <>
                                <div
                                    style={{
                                        width: '32px',
                                        height: '32px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        transition: 'background 0.2s',
                                        background: notificationOpen ? '#E6F4FF' : 'transparent',
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!notificationOpen) {
                                            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.06)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!notificationOpen) {
                                            e.currentTarget.style.background = 'transparent';
                                        }
                                    }}
                                    onClick={() => setNotificationOpen(true)}
                                >
                                    <Badge dot={true}>
                                        <MailOutlined style={{ fontSize: '16px', color: '#000' }} />
                                    </Badge>
                                </div>
                                <Drawer
                                    title="Thông báo"
                                    placement="bottom"
                                    open={notificationOpen}
                                    onClose={() => setNotificationOpen(false)}
                                    height="70vh"
                                    styles={{
                                        body: { paddingTop: 0 }
                                    }}
                                >
                                    <NotificationContent />
                                </Drawer>
                            </>
                        ) : (
                            <Popover
                                content={<NotificationContent />}
                                title="Thông báo"
                                trigger="click"
                                open={notificationOpen}
                                onOpenChange={setNotificationOpen}
                                placement="bottomRight"
                            >
                                <div
                                    style={{
                                        width: '32px',
                                        height: '32px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        transition: 'background 0.2s',
                                        background: notificationOpen ? '#E6F4FF' : 'transparent',
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!notificationOpen) {
                                            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.06)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!notificationOpen) {
                                            e.currentTarget.style.background = 'transparent';
                                        }
                                    }}
                                >
                                    <Badge dot={true}>
                                        <MailOutlined style={{ fontSize: '16px', color: '#000' }} />
                                    </Badge>
                                </div>
                            </Popover>
                        )}

                        <div
                            style={{
                                width: '32px',
                                height: '32px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                transition: 'background 0.2s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.06)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            onClick={() => console.log('Logout clicked')}
                        >
                            <img
                                src={LogoutIcon}
                                alt="logout"
                                style={{
                                    width: '20px',
                                    height: '20px',
                                    filter: 'brightness(0) saturate(100%) invert(27%) sepia(94%) saturate(3529%) hue-rotate(346deg) brightness(99%) contrast(102%)',
                                    transform: isMobile ? 'scaleX(-1)' : undefined,
                                }}
                            />
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <Content style={{
                    padding: '8px',
                    background: '#fff',
                    flex: 1,
                    overflowY: 'auto',
                    WebkitOverflowScrolling: 'touch',
                    overscrollBehavior: 'none',
                }}>
                    <Outlet />
                </Content>
            </div>
        </div>
    );
};

export default MainLayout;
