// src/pages/users/UserDetailModal.tsx
import React, { useState } from 'react';
import { Segmented, Descriptions, Tag, Button, Space, Popconfirm, Input, Select, DatePicker } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { DescriptionsProps } from 'antd';
import BaseModal from '../../components/common/BaseModal';

const { Option } = Select;

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
    const [isEditing, setIsEditing] = useState(false);

    // Mock data để hiển thị giao diện
    const [mockUserData, setMockUserData] = useState({
        name: 'Nguyễn Văn An',
        user_id: 'EDU001',
        birth_date: '15-03-1990',
        cccd: '012345678901',
        email: 'nguyennn@edulive.net',
        role: 'manager',
        status: 'active',
        position: 'Team Leader',
        department: 'Phòng Phát triển',
        created_at: '10-01-2023 09:30',
        updated_at: '05-09-2025 14:22',
        updated_by: 'Admin System'
    });

    const handleFieldChange = (field: string, value: string) => {
        setMockUserData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSave = () => {
        console.log('Lưu thông tin:', mockUserData);
        onSave?.(mockUserData as any);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setIsEditing(false);
        // Reset lại dữ liệu nếu cần
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
            children: isEditing ? (
                <Input
                    value={mockUserData.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                />
            ) : mockUserData.name,
        },
        {
            label: 'Mã nhân viên',
            children: mockUserData.user_id, // Không cho phép sửa
        },
        {
            label: 'Ngày sinh',
            children: isEditing ? (
                <DatePicker
                    value={mockUserData.birth_date ? dayjs(mockUserData.birth_date, 'DD-MM-YYYY') : dayjs('01-01-2000', 'DD-MM-YYYY')}
                    onChange={(date) => {
                        const formattedDate = date ? date.format('DD-MM-YYYY') : '01-01-2000';
                        handleFieldChange('birth_date', formattedDate);
                    }}
                    format="DD-MM-YYYY"
                    placeholder="Chọn ngày sinh"
                    style={{ width: '100%' }}
                    inputReadOnly
                />
            ) : mockUserData.birth_date,
        },
        {
            label: 'Số CCCD',
            children: isEditing ? (
                <Input
                    value={mockUserData.cccd}
                    onChange={(e) => handleFieldChange('cccd', e.target.value)}
                />
            ) : mockUserData.cccd,
        },
        {
            label: 'Email',
            children: isEditing ? (
                <Input
                    value={mockUserData.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                />
            ) : mockUserData.email,
        },
        {
            label: 'Chức vụ',
            children: isEditing ? (
                <Input
                    value={mockUserData.position}
                    onChange={(e) => handleFieldChange('position', e.target.value)}
                />
            ) : mockUserData.position,
        },
        {
            label: 'Phòng ban',
            children: isEditing ? (
                <Input
                    value={mockUserData.department}
                    onChange={(e) => handleFieldChange('department', e.target.value)}
                />
            ) : mockUserData.department,
        },
        {
            label: 'Tạo lúc',
            span: { xs: 1, sm: 2, md: 2, lg: 2, xl: 2, xxl: 2 },
            children: mockUserData.created_at, // Không cho phép sửa
        },
        {
            label: 'Vai trò',
            children: isEditing ? (
            <Select 
            value={mockUserData.role}
            onChange={(value) => handleFieldChange('role', value)}
            style={{ width: '100%' }}
            >
            <Option value="user">
              <Tag color="blue">USER</Tag>
            </Option>
              <Option value="manager">
                  <Tag color="orange">MANAGER</Tag>
          </Option>
          <Option value="admin">
            <Tag color="red">ADMIN</Tag>
          </Option>
        </Select>
      ) : (
                <Tag color={getRoleColor(mockUserData.role)}>
                    {mockUserData.role.toUpperCase()}
                </Tag>
            ),
        },
        {
            label: 'Trạng thái',
            children: isEditing ? (
            <Select 
            value={mockUserData.status}
            onChange={(value) => handleFieldChange('status', value)}
            style={{ width: '100%' }}
            >
            <Option value="active">
              <Tag color="green">ACTIVE</Tag>
              </Option>
                <Option value="inactive">
            <Tag color="volcano">INACTIVE</Tag>
          </Option>
        </Select>
      ) : (
                <Tag color={getStatusColor(mockUserData.status)}>
                    {mockUserData.status === 'active' ? 'HOẠT ĐỘNG' : 'NGƯNG HOẠT ĐỘNG'}
                </Tag>
            ),
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
                isEditing ? (
                    // Buttons khi đang edit
                    <Button key="cancel" onClick={handleCancel}>
                        Hủy
                    </Button>
                ) : (
                    // Button xóa khi không edit
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
                    </Popconfirm>
                ),
                isEditing ? (
                    // Button lưu khi đang edit
                    <Button key="save" type="primary" onClick={handleSave}>
                        Lưu
                    </Button>
                ) : (
                    // Button chỉnh sửa khi không edit
                    <Button key="edit" type="primary" onClick={() => setIsEditing(true)}>
                        Chỉnh sửa
                    </Button>
                ),
            ]}
        >
            <div>
                <Segmented
                    options={['Thông tin', 'Thư viện hình ảnh']}
                    block
                    value={selectedTab}
                    onChange={setSelectedTab}
                    style={{
                        marginBottom: 20,
                        backgroundColor: '#f5f5f5'
                    }}
                />
                {renderContent()}
            </div>
        </BaseModal>
    );
}