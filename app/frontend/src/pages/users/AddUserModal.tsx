// src/pages/users/AddUserModal.tsx
import { useState } from 'react';
import { Segmented, Descriptions, Tag, Button, Input, Select, DatePicker, Image, Upload, Row, Col, App } from 'antd';
import { InboxOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { DescriptionsProps, UploadProps } from 'antd';
import BaseModal from '../../components/common/BaseModal';

const { Option } = Select;
const { Dragger } = Upload;

interface Props {
    open: boolean;
    onClose: () => void;
    onSave?: (user: any) => void;
}

export default function AddUserModal({
    open,
    onClose,
    onSave
}: Props) {
    const { message } = App.useApp();
    const [selectedTab, setSelectedTab] = useState<string | number>('Thông tin');
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [imageList, setImageList] = useState<string[]>([]);
    const [deletedImageIndexes, setDeletedImageIndexes] = useState<number[]>([]);

    // Dữ liệu form trống cho user mới
    const [userData, setUserData] = useState({
        name: '',
        birth_date: '',
        cccd: '',
        email: '',
        role: 'user',
        status: 'active',
        position: '',
        department: ''
    });

    const handleFieldChange = (field: string, value: string) => {
        setUserData(prev => ({
            ...prev,
            [field]: value
        }));
        setHasUnsavedChanges(true);
    };

    const handleSave = () => {
    // Validation bắt buộc
    if (!userData.name.trim()) {
      message.error('Vui lòng nhập họ và tên!');
      return;
    }

    console.log('Thêm user mới:', userData);
    onSave?.(userData);
    message.success('Đã thêm nhân viên thành công!');
    resetForm();
    onClose();
  };

    const handleCancel = () => {
        if (hasUnsavedChanges) {
            message.warning('Các thay đổi chưa được lưu sẽ bị mất!');
        }
        resetForm();
        onClose();
    };

    const resetForm = () => {
        setUserData({
            name: '',
            birth_date: '',
            cccd: '',
            email: '',
            role: 'user',
            status: 'active',
            position: '',
            department: ''
        });
        setSelectedTab('Thông tin');
        setHasUnsavedChanges(false);
        setImageList([]);
        setDeletedImageIndexes([]);
    };

    const handleDeleteImage = (index: number) => {
        setDeletedImageIndexes(prev => [...prev, index]);
        setHasUnsavedChanges(true);
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
            if (status === 'done') {
                message.success(`${info.file.name} tải lên thành công!`);
                // Giả lập thêm ảnh mới
                const newImageUrl = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop';
                setImageList(prev => [...prev, newImageUrl]);
                setHasUnsavedChanges(true);
            } else if (status === 'error') {
                message.error(`${info.file.name} tải lên thất bại!`);
            }
        },
    };

    const userInfoItems: DescriptionsProps['items'] = [
        {
            label: 'Họ và tên',
            children: (
                <Input
                    value={userData.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    placeholder="Nhập họ và tên"
                    status={!userData.name.trim() ? 'error' : ''}
                />
            ),
        },
        {
            label: 'Ngày sinh',
            children: (
                <DatePicker
                    value={userData.birth_date ? dayjs(userData.birth_date, 'DD-MM-YYYY') : null}
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
            ),
        },
        {
            label: 'Số CCCD',
            children: (
                <Input
                    value={userData.cccd}
                    onChange={(e) => handleFieldChange('cccd', e.target.value)}
                    placeholder="Nhập số CCCD"
                />
            ),
        },
        {
            label: 'Email',
            children: (
                <Input
                    value={userData.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    placeholder="Nhập email"
                />
            ),
        },
        {
            label: 'Chức vụ',
            children: (
                <Input
                    value={userData.position}
                    onChange={(e) => handleFieldChange('position', e.target.value)}
                    placeholder="Nhập chức vụ"
                />
            ),
        },
        {
            label: 'Phòng ban',
            children: (
                <Input
                    value={userData.department}
                    onChange={(e) => handleFieldChange('department', e.target.value)}
                    placeholder="Nhập phòng ban"
                />
            ),
        },
        {
            label: 'Vai trò',
            children: (
                <Select
                    value={userData.role}
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
            ),
        },
        {
            label: 'Trạng thái',
            children: (
                <Select
                    value={userData.status}
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
            ),
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

        if (selectedTab === 'Tải lên ảnh') {
            return (
                <div>
                    <Dragger {...uploadProps} className="upload-dragger">
                        <p className="ant-upload-drag-icon">
                            <InboxOutlined />
                        </p>
                        <p className="ant-upload-text">Click hoặc kéo thả file vào khu vực này để tải lên</p>
                        <p className="ant-upload-hint">
                            Hỗ trợ tải lên nhiều ảnh cùng lúc. Chỉ cho phép tải lên file hình ảnh.
                        </p>
                    </Dragger>

                    {imageList.length > 0 && (
                        <>
                            <h4 style={{ marginTop: 24 }}>Hình ảnh đã tải lên:</h4>
                            <Row gutter={[16, 16]}>
                                {imageList.map((img, index) => {
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
                        </>
                    )}
                </div>
            );
        }
    };

    return (
        <BaseModal
            title="Thêm nhân viên mới"
            open={open}
            onCancel={handleCancel}
            footer={[
                <Button key="cancel" onClick={handleCancel}>
                    Hủy
                </Button>,
                <Button key="save" type="primary" onClick={handleSave}>
                    Lưu
                </Button>,
            ]}
        >
            <div>
                <Segmented
                    options={['Thông tin', 'Tải lên ảnh']}
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