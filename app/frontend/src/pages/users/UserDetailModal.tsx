// src/pages/users/UserDetailModal.tsx
import { useState } from 'react';
import { Segmented, Descriptions, Tag, Button, Popconfirm, Input, Select, DatePicker, Image, Upload, Row, Col, App } from 'antd';
import { QuestionCircleOutlined, InboxOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { DescriptionsProps, UploadProps } from 'antd';
import BaseModal from '../../components/common/BaseModal';

const { Option } = Select;
const { Dragger } = Upload;

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
    const { message } = App.useApp();
    const [selectedTab, setSelectedTab] = useState<string | number>('Thông tin');
    const [isEditing, setIsEditing] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [originalData, setOriginalData] = useState({});
    const [imageList, setImageList] = useState([
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop',
        'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=200&h=200&fit=crop',
        'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&h=200&fit=crop',
        'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop'
    ]);
    const [deletedImageIndexes, setDeletedImageIndexes] = useState<number[]>([]);

    // Mock data để hiển thị giao diện
    const [mockUserData, setMockUserData] = useState({
        name: 'Nguyễn Văn An',
        user_id: 'EDU001',
        birth_date: '',
        cccd: '012345678901',
        email: 'nguyenvanan@edulive.net',
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
        setHasUnsavedChanges(true);
    };

    const handleSave = () => {
        console.log('Lưu thông tin:', mockUserData);
        onSave?.(mockUserData as any);
        setIsEditing(false);
        setHasUnsavedChanges(false);
        setDeletedImageIndexes([]); // Xóa danh sách ảnh bị ẩn sau khi lưu
        message.success('Đã lưu thông tin thành công!');
    };

    const handleCancel = () => {
        setMockUserData(originalData as any);
        setDeletedImageIndexes([]); // Khôi phục lại tất cả ảnh đã ẩn
        setIsEditing(false);
        setHasUnsavedChanges(false);
        message.success('Đã huỷ bỏ các thay đổi!');
    };

    const handleModalClose = () => {
        if (isEditing && hasUnsavedChanges) {
            message.warning('Các thay đổi chưa được lưu sẽ bị mất!');
            setTimeout(() => {
                resetModalState();
                onClose();
            }, 1500);
        } else {
            resetModalState();
            onClose();
        }
    };

    const resetModalState = () => {
        setSelectedTab('Thông tin');
        setIsEditing(false);
        setHasUnsavedChanges(false);
        setDeletedImageIndexes([]); // Reset danh sách ảnh ẩn
    };

    const handleStartEdit = () => {
        setOriginalData({ ...mockUserData });
        setIsEditing(true);
        setHasUnsavedChanges(false);
    };

    const handleDeleteImage = (index: number) => {
        setDeletedImageIndexes(prev => [...prev, index]); // Thêm index vào danh sách ảnh bị ẩn
        setHasUnsavedChanges(true);
        // Không hiển thị message thành công, chỉ ẩn ảnh
    };

    const uploadProps: UploadProps = {
    name: 'file',
    multiple: true,
    action: 'https://660d2bd96ddfa2943b33731c.mockapi.io/api/upload',
    accept: 'image/*',
    showUploadList: {
    showPreviewIcon: true,
    showRemoveIcon: true,
    showDownloadIcon: false,
    },
    listType: 'picture',
    onChange(info) {
    const { status } = info.file;
    if (status !== 'uploading') {
    console.log(info.file, info.fileList);
    }
    if (status === 'done') {
    message.success(`${info.file.name} tải lên thành công!`);
      // Giả lập thêm ảnh mới vào danh sách
        const newImageUrl = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop';
        setImageList(prev => [...prev, newImageUrl]);
      setHasUnsavedChanges(true);
      } else if (status === 'error') {
          message.error(`${info.file.name} tải lên thất bại!`);
      }
    },
    onDrop(e) {
      console.log('Dropped files', e.dataTransfer.files);
    },
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
            children: mockUserData.user_id,
        },
        {
            label: 'Ngày sinh',
            children: isEditing ? (
                <DatePicker
                    value={mockUserData.birth_date ? dayjs(mockUserData.birth_date, 'DD-MM-YYYY') : null}
                    onChange={(date) => {
                        const formattedDate = date ? date.format('DD-MM-YYYY') : '';
                        handleFieldChange('birth_date', formattedDate);
                    }}
                    defaultPickerValue={dayjs('01-01-2000', 'DD-MM-YYYY')}
                    format="DD-MM-YYYY"
                    placeholder="Chọn ngày sinh"
                    style={{ width: '100%' }}
                    inputReadOnly
                    allowClear
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
                    {isEditing ? (
                        // Chế độ edit - Upload và quản lý ảnh
                        <div>
                            <Dragger {...uploadProps}>
                            <p className="ant-upload-drag-icon">
                            <InboxOutlined />
                            </p>
                            <p className="ant-upload-text">Click hoặc kéo thả file vào khu vực này để tải lên</p>
                            <p className="ant-upload-hint">
                            Hỗ trợ tải lên nhiều ảnh cùng lúc. Chỉ cho phép tải lên file hình ảnh.
                            </p>
                            </Dragger>

                            <h4 style={{ marginTop: 16 }}>Hình ảnh hiện tại:</h4>
                            <Row gutter={[16, 16]}>
                                {imageList.map((img, index) => {
                                    // Ẩn ảnh nếu nó ở trong danh sách bị xóa
                                    if (deletedImageIndexes.includes(index)) {
                                        return null;
                                    }

                                    return (
                                        <Col className="gutter-row" span={6} key={index}>
                                            <div style={{ position: 'relative' }}>
                                                <Image
                                                    width="100%"
                                                    height={150}
                                                    style={{ objectFit: 'cover', borderRadius: 8 }}
                                                    src={img}
                                                />
                                                <Button
                                                    danger
                                                    size="small"
                                                    icon={<DeleteOutlined />}
                                                    onClick={() => handleDeleteImage(index)}
                                                    style={{
                                                        position: 'absolute',
                                                        top: 8,
                                                        right: 8,
                                                        borderRadius: '50%'
                                                    }}
                                                />
                                            </div>
                                        </Col>
                                    );
                                })}
                            </Row>
                        </div>
                    ) : (
                        // Chế độ xem - Hiển thị ảnh
                        <Row gutter={[16, 16]}>
                            {imageList.map((img, index) => (
                                <Col className="gutter-row" span={6} key={index}>
                                    <Image
                                        width="100%"
                                        height={150}
                                        style={{ objectFit: 'cover', borderRadius: 8 }}
                                        src={img}
                                    />
                                </Col>
                            ))}
                        </Row>
                    )}
                </div>
            );
        }
    };

    return (
        <BaseModal
            title="Quản lý nhân viên"
            open={open}
            onCancel={handleModalClose}
            footer={[
                isEditing ? (
                    <Button key="cancel" onClick={handleCancel}>
                        Hủy
                    </Button>
                ) : (
                    <Popconfirm
                        key="delete-confirm"
                        title="Xóa nhân viên"
                        description="Bạn có chắc chắn muốn xóa nhân viên này?"
                        icon={<QuestionCircleOutlined style={{ color: 'red' }} />}
                        onConfirm={() => {
                            console.log('Xóa nhân viên:', mockUserData.user_id);
                            onDelete?.(mockUserData.user_id);
                            onClose();
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
                    <Button key="save" type="primary" onClick={handleSave}>
                        Lưu
                    </Button>
                ) : (
                    <Button key="edit" type="primary" onClick={handleStartEdit}>
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