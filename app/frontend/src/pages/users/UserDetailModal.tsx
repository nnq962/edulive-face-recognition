// src/pages/users/UserDetailModal.tsx
import React, { useState } from 'react';
import { Segmented, Descriptions, Tag, Button, Space, Popconfirm } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import type { DescriptionsProps } from 'antd';
import BaseModal from '../../components/common/BaseModal';

interface User {
    user_id: string;
    name: string;
    email: string;
    role: 'admin' | 'manager' | 'user' | string;
    position: string;
    department: string;
    created_at: string;
    active: boolean;
}

interface Props {
    user: User | null;
    open: boolean;
    onClose: () => void;
    onSave?: (user: User) => void;
    onDelete?: (userId: string) => void;
}

export default function UserDetailModal({
    user,
    open,
    onClose,
    onSave,
    onDelete
}: Props) {
    const [selectedTab, setSelectedTab] = useState<string | number>('Thông tin');

    // Mock data để hiển thị giao diện
    const mockUserData = {
        name: 'Nguyễn Văn An',
        user_id: 'EDU001',
        birth_date: '15/03/1990',
        cccd: '012345678901',
        email: 'annn@edulive.net',
        role: 'manager',
        status: 'active',
        position: 'Team Leader',
        department: 'Phòng Phát triển',
        created_at: '10-01-2023 09:30',
        updated_at: '05-09-2025 14:22',
        updated_by: 'Admin System'
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'admin': return 'red';
            case 'manager': return 'orange';
            case 'user': return 'blue';
            default: return 'default';
        }
    };

    const getStatusColor = (status: string) => {
        return status === 'active' ? 'green' : 'volcano';
    };

    const userInfoItems: DescriptionsProps['items'] = [
        {
            label: 'Họ và tên',
            children: mockUserData.name,
        },
        {
            label: 'Mã nhân viên',
            children: mockUserData.user_id,
        },
        {
            label: 'Ngày sinh',
            children: mockUserData.birth_date,
        },
        {
            label: 'Số CCCD',
            children: mockUserData.cccd,
        },
        {
            label: 'Email',
            children: mockUserData.email,
        },
        {
            label: 'Vai trò',
            children: (
                <Tag color={getRoleColor(mockUserData.role)}>
                    {mockUserData.role.toUpperCase()}
                </Tag>
            ),
        },
        {
            label: 'Trạng thái',
            children: (
                <Tag color={getStatusColor(mockUserData.status)}>
                    {mockUserData.status === 'active' ? 'HOẠT ĐỘNG' : 'NGƯNG HOẠT ĐỘNG'}
                </Tag>
            ),
        },
        {
            label: 'Chức vụ',
            children: mockUserData.position,
        },
        {
            label: 'Phòng ban',
            children: mockUserData.department,
        },
        {
            label: 'Tạo lúc',
            span: { xs: 1, sm: 2, md: 2, lg: 2, xl: 2, xxl: 2 },
            children: mockUserData.created_at,
        },
        {
            label: 'Sửa đổi cuối',
            span: { xs: 1, sm: 2, md: 2, lg: 2, xl: 2, xxl: 2 },
            children: `${mockUserData.updated_at} - Bởi: ${mockUserData.updated_by}`,
        },
    ];

    const renderContent = () => {
        if (selectedTab === 'Thông tin') {
            return (
                <Descriptions
                    bordered
                    column={{ xs: 1, sm: 2, md: 2, lg: 2, xl: 2, xxl: 2 }}
                    items={userInfoItems}
                />
            );
        }

        if (selectedTab === 'Thư viện hình ảnh') {
            return (
                <div>
                    <p>Nội dung tab Thư viện hình ảnh</p>
                    <p>Đây là tab thứ hai</p>
                </div>
            );
        }
    };

    return (
        <BaseModal
            title="Quản lý nhân viên"
            open={open}
            onCancel={onClose}
            footer={[
                <Popconfirm
                    key="delete-confirm"
                    title="Xóa nhân viên"
                    description="Bạn có chắc chắn muốn xóa nhân viên này?"
                    icon={<QuestionCircleOutlined style={{ color: 'red' }} />}
                    onConfirm={() => {
                        console.log('Xóa nhân viên:', mockUserData.user_id);
                        onDelete?.(mockUserData.user_id);
                        onClose(); // Đóng modal sau khi xóa
                    }}
                    okText="Xóa"
                    cancelText="Hủy"
                    okType="danger"
                >
                    <Button danger>
                        Xóa
                    </Button>
                </Popconfirm>,
                <Button key="edit" type="primary" onClick={() => {
                    console.log('Chỉnh sửa nhân viên');
                    // Logic chỉnh sửa ở đây
                }}>
                    Chỉnh sửa
                </Button>,
            ]}
        >
            <div>
                <Segmented
                    options={['Thông tin', 'Thư viện hình ảnh']}
                    block
                    value={selectedTab}
                    onChange={setSelectedTab}
                    style={{
                        marginBottom: 15,
                        backgroundColor: '#f5f5f5'
                    }}
                />
                {renderContent()}
            </div>
        </BaseModal>
    );
}