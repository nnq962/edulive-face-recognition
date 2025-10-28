import React from 'react';
import { Layout, Badge, Tabs, Tooltip, message } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
    MenuOutlined,
    VideoCameraOutlined,
    DatabaseOutlined,
    CheckCircleOutlined,
    UserOutlined,
    SettingOutlined,
    ScheduleOutlined
} from '@ant-design/icons';
import LogoutIcon from '../assets/icons/logout.svg';
import { useAuth } from '@/contexts/AuthContext';

const { Content } = Layout;

// Map routes với icon và title
const routeConfig: Record<string, { icon: React.ReactNode; title: string; allowedRoles: string[] }> = {
    '/attendance': { 
        icon: <VideoCameraOutlined />, 
        title: 'Chấm công',
        allowedRoles: ['user', 'admin', 'super_admin'] // Tất cả đều thấy
    },
    '/export': { 
        icon: <DatabaseOutlined />, 
        title: 'Dữ liệu',
        allowedRoles: ['admin', 'super_admin'] // Chỉ admin và super_admin
    },
    // '/approvals': { 
    //     icon: <CheckCircleOutlined />, 
    //     title: 'Phê duyệt',
    //     allowedRoles: ['admin', 'super_admin'] // Chỉ admin và super_admin
    // },
    '/employees': { 
        icon: <UserOutlined />, 
        title: 'Nhân sự',
        allowedRoles: ['admin', 'super_admin'] // Chỉ admin và super_admin
    },
    '/settings': { 
        icon: <SettingOutlined />, 
        title: 'Cài đặt',
        allowedRoles: ['user', 'admin', 'super_admin'] // Tất cả đều thấy
    },
};

const MainLayout: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, setUser } = useAuth(); // Thêm setUser để reset user
    const currentPath = `/${location.pathname.split('/')[1] || 'attendance'}`;
    const currentRoute = routeConfig[currentPath] || { icon: <VideoCameraOutlined />, title: 'Chấm công', allowedRoles: [] };
    // Lọc menu theo role của user
    const filteredRoutes = React.useMemo(() => {
        if (!user) return {}; // Nếu chưa có user thì không hiển thị menu nào
        
        return Object.entries(routeConfig).reduce((acc, [path, config]) => {
            // Kiểm tra xem role của user có trong allowedRoles không
            if (config.allowedRoles.includes(user.role)) {
                acc[path] = config;
            }
            return acc;
        }, {} as typeof routeConfig);
    }, [user]);

    const [sidebarCollapsed, setSidebarCollapsed] = React.useState(() => {
        const saved = localStorage.getItem('sidebarCollapsed');
        if (saved !== null) {
            return JSON.parse(saved);
        }
        // Mặc định: mobile đóng, desktop mở
        return window.innerWidth < 768;
    });

    const [isMobile, setIsMobile] = React.useState(() => window.innerWidth < 768);

    // Mock số lượng phê duyệt
    const [pendingApprovalsCount] = React.useState(97);

    // Mock trạng thái máy chấm công
    const [deviceStatus] = React.useState({
        isOnline: true, // true = online (xanh), false = offline (đỏ)
        lastUpdate: '14:30', // Thời gian từ API
    });

    // Hàm xử lý logout
    const handleLogout = () => {
        // Bước 1: Xóa token khỏi localStorage
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        
        // Bước 2: Reset user trong Context về null
        setUser(null);
        
        // Bước 3: Redirect về trang login
        navigate('/login', { replace: true });

        message.success('Đăng xuất thành công');
    };

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
                    width: '220px',
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
                    {Object.entries(filteredRoutes).map(([path, config]) => (
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
                left: sidebarCollapsed ? '0' : '220px',
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
                            onClick={handleLogout}
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
