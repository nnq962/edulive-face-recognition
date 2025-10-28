import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Button, Space, message, Popconfirm, Tabs, Upload, Image, Card } from 'antd';
import { DeleteOutlined, SaveOutlined, InboxOutlined, CloseCircleFilled, SettingOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { employeesApi } from '@/api';
import { useDepartments } from '@/contexts/DepartmentsContext';
import DepartmentModal from './DepartmentModal';

const { Dragger } = Upload;
const { Option } = Select;

interface EmployeeData {
    key: string;
    employeeName: string;
    email: string;
    role: 'User' | 'Admin' | 'Super Admin';
    position: string;
    department: string;
    telegram: string;
    status: 'active' | 'inactive';
}

interface EmployeeManagementDetailModalProps {
    open: boolean;
    onClose: () => void;
    employeeData: EmployeeData | null;
    onUpdate?: (data: EmployeeData) => void;
    onDelete?: (key: string) => void;
    onAddSuccess?: () => void; // reload bảng dữ liệu sau update
}

const EmployeeManagementDetailModal: React.FC<EmployeeManagementDetailModalProps> = ({
    open,
    onClose,
    employeeData,
    onUpdate,
    onDelete,
    onAddSuccess,
}) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('1');
    const [images, setImages] = useState<string[]>([]);

    // Department hook
    const { departments, loading: departmentsLoading, reload } = useDepartments();

    const [departmentModalOpen, setDepartmentModalOpen] = useState(false);

    useEffect(() => {
        if (employeeData && open && departments.length > 0) {
            form.setFieldsValue({
                employeeName: employeeData.employeeName,
                email: employeeData.email,
                role: employeeData.role.toLowerCase(),
                position: employeeData.position,
                department: employeeData.department,
                telegram: employeeData.telegram,
                status: employeeData.status,
            });

            // Mock images cho user
            const mockImages = [
                'https://cellphones.com.vn/sforum/wp-content/uploads/2024/04/anh-chan-dung-2.jpg',
                'https://cellphones.com.vn/sforum/wp-content/uploads/2024/04/anh-chan-dung-2.jpg',
                'https://cellphones.com.vn/sforum/wp-content/uploads/2024/04/anh-chan-dung-2.jpg',
                'https://cellphones.com.vn/sforum/wp-content/uploads/2024/04/anh-chan-dung-2.jpg',
            ];
            setImages(mockImages);
            setActiveTab('1');
        }
    }, [employeeData, open, departments, form]);

    const handleUpdate = async () => {
        if (!employeeData) return;

        try {
            const values = await form.validateFields();
            setLoading(true);

            const payload = {
                full_name: values.employeeName,
                email: values.email,
                role: values.role,
                position: values.position,
                department: values.department,
                telegram_username: values.telegram,
                is_active: values.status === 'active',
            };

            console.log('Payload:', payload);

            await employeesApi.updateUser(employeeData.key, payload);

            message.success('Cập nhật thông tin nhân viên thành công');

            if (typeof onAddSuccess === 'function') {
                onAddSuccess(); // reload bảng dữ liệu
            }

            setLoading(false);
            form.resetFields();
            onClose();
        } catch (error: any) {
            console.error('Lỗi khi cập nhật nhân viên:', error);
            const errorMessage = error.response?.data?.detail || error.response?.data?.message || 'Lỗi khi cập nhật nhân viên';
            message.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!employeeData) return;

        try {
            setLoading(true);

            // Gọi API xóa user
            await employeesApi.deleteUser(employeeData.key);

            // Thông báo thành công
            message.success('Xóa nhân viên thành công');

            // Gọi callback để cập nhật danh sách
            if (onDelete) {
                onDelete(employeeData.key);
            }

            // Đóng modal và reset form
            onClose();
            form.resetFields();

        } catch (error: any) {
            console.error('Lỗi khi xóa nhân viên:', error);

            // Hiển thị lỗi cụ thể từ backend
            const errorMessage = error.response?.data?.detail ||
                error.response?.data?.message ||
                'Lỗi khi xóa nhân viên';

            message.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        form.resetFields();
        setActiveTab('1');
        setImages([]);
        onClose();
    };

    const uploadProps: UploadProps = {
        name: 'file',
        multiple: true,
        action: '/api/upload', // Thay bằng API endpoint thật
        onChange(info) {
            const { status } = info.file;
            if (status === 'done') {
                message.success(`${info.file.name} tải lên thành công.`);
            } else if (status === 'error') {
                message.error(`${info.file.name} tải lên thất bại.`);
            }
        },
        beforeUpload: (file) => {
            const isImage = file.type.startsWith('image/');
            if (!isImage) {
                message.error('Bạn chỉ có thể upload file ảnh!');
                return false;
            }
            const isLt5M = file.size / 1024 / 1024 < 10;
            if (!isLt5M) {
                message.error('Kích thước file phải nhỏ hơn 10MB!');
                return false;
            }
            return isLt5M;
        },
    };

    const handleRemoveImage = (index: number) => {
        setImages(prevImages => prevImages.filter((_, i) => i !== index));
        message.success('Đã xóa ảnh');
    };

    if (!employeeData) return null;

    return (
        <>
            <Modal
                title="Thông tin nhân viên"
                centered
                open={open}
                onCancel={handleCancel}
                footer={null}
                width={{
                    xs: '90%',
                    sm: '80%',
                    md: '70%',
                    lg: '60%',
                    xl: '50%',
                    xxl: '40%',
                }}
            >
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={[
                        {
                            key: '1',
                            label: 'Thông tin cơ bản',
                            children: (
                                <>
                                    <Form
                                        form={form}
                                        layout="horizontal"
                                        labelCol={{ xs: { span: 24 }, sm: { span: 8 } }}
                                        wrapperCol={{ xs: { span: 24 }, sm: { span: 16 } }}
                                        style={{ maxWidth: 600 }}
                                    >
                                        <Form.Item
                                            name="employeeName"
                                            label="Tên nhân viên"
                                            rules={[
                                                { required: true, message: 'Vui lòng nhập tên nhân viên!' },
                                                { whitespace: true, message: 'Tên không được chỉ chứa khoảng trắng!' }
                                            ]}
                                        >
                                            <Input placeholder="Nhập tên nhân viên" />
                                        </Form.Item>

                                        <Form.Item
                                            name="email"
                                            label="Email"
                                            rules={[
                                                { type: 'email', message: 'Email không hợp lệ!' },
                                                { required: false, message: 'Vui lòng nhập email!' }
                                            ]}
                                        >
                                            <Input placeholder="Nhập email" />
                                        </Form.Item>

                                        <Form.Item
                                            name="role"
                                            label="Vai trò"
                                            rules={[{ required: true, message: 'Vui lòng chọn vai trò!' }]}
                                        >
                                            <Select placeholder="Chọn vai trò">
                                                <Option value="user">User</Option>
                                                <Option value="admin">Admin</Option>
                                                <Option value="super_admin">Super Admin</Option>
                                            </Select>
                                        </Form.Item>

                                        <Form.Item
                                            name="position"
                                            label="Chức vụ"
                                            rules={[
                                                { required: true, message: 'Vui lòng nhập chức vụ!' },
                                                { whitespace: true, message: 'Chức vụ không được chỉ chứa khoảng trắng!' }
                                            ]}
                                        >
                                            <Input placeholder="Nhập chức vụ (VD: Dev AI, Dev Frontend)" />
                                        </Form.Item>

                                        <Form.Item
                                            label="Phòng ban"
                                            required
                                        >
                                            <Space.Compact style={{ width: '100%' }}>
                                                <Form.Item
                                                    name="department"
                                                    noStyle
                                                    rules={[{ required: true, message: 'Vui lòng chọn phòng ban!' }]}
                                                >
                                                    <Select
                                                        placeholder="Chọn phòng ban"
                                                        style={{ width: '100%' }}
                                                        loading={departmentsLoading}
                                                    >
                                                        {departments.map(dept => (
                                                            <Option key={dept.id} value={dept.name}>
                                                                {dept.name}
                                                            </Option>
                                                        ))}
                                                    </Select>
                                                </Form.Item>
                                                <Button
                                                    icon={<SettingOutlined />}
                                                    onClick={() => setDepartmentModalOpen(true)}
                                                    type="default"
                                                    aria-label="Quản lý phòng ban"
                                                />
                                            </Space.Compact>
                                        </Form.Item>

                                        <Form.Item
                                            name="telegram"
                                            label="Telegram"
                                            rules={[
                                                { required: false, message: 'Vui lòng nhập Telegram!' },
                                                { pattern: /^\w+$/, message: 'Telegram chỉ chứa chữ, số và dấu gạch dưới!' }
                                            ]}
                                        >
                                            <Input
                                                addonBefore="@"
                                                placeholder="username"
                                            />
                                        </Form.Item>

                                        <Form.Item
                                            name="status"
                                            label="Trạng thái"
                                            rules={[{ required: true, message: 'Vui lòng chọn trạng thái!' }]}
                                        >
                                            <Select placeholder="Chọn trạng thái">
                                                <Option value="active">Hoạt động</Option>
                                                <Option value="inactive">Đã nghỉ</Option>
                                            </Select>
                                        </Form.Item>
                                    </Form>

                                    <Space style={{ width: '100%', justifyContent: 'space-between', marginTop: 8 }}>
                                        <Popconfirm
                                            title="Xóa nhân viên"
                                            description={
                                                <>
                                                    Bạn có chắc chắn muốn xóa nhân viên <strong>{employeeData.employeeName}</strong>?
                                                </>
                                            }
                                            onConfirm={handleDelete}
                                            okText="Xóa"
                                            cancelText="Hủy"
                                            okButtonProps={{ danger: true }}
                                        >
                                            <Button
                                                danger
                                                icon={<DeleteOutlined />}
                                                loading={loading}
                                            >
                                                Xóa nhân viên
                                            </Button>
                                        </Popconfirm>

                                        <Space>
                                            <Button
                                                type="primary"
                                                icon={<SaveOutlined />}
                                                loading={loading}
                                                onClick={handleUpdate}
                                            >
                                                Lưu thay đổi
                                            </Button>
                                        </Space>
                                    </Space>
                                </>
                            ),
                        },
                        {
                            key: '2',
                            label: 'Thư viện hình ảnh',
                            children: (
                                <>
                                    <Card
                                        title="Ảnh khuôn mặt hiện có"
                                        style={{
                                            marginBottom: 8,
                                            boxShadow: '0 2px 16px rgba(0,0,0,0.12)',
                                            borderRadius: 8,
                                        }}
                                        size="small"
                                    >
                                        {images.length === 0 ? (
                                            <div style={{
                                                textAlign: 'center',
                                                padding: '40px 0',
                                                color: '#999'
                                            }}>
                                                Chưa có ảnh nào
                                            </div>
                                        ) : (
                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(4, 1fr)',
                                                gap: 8
                                            }}>
                                                {images.map((image, index) => (
                                                    <Card
                                                        key={index}
                                                        size="small"
                                                        variant="borderless"
                                                        style={{
                                                            textAlign: 'center',
                                                            padding: 0,
                                                            background: 'transparent',
                                                            boxShadow: 'none',
                                                            border: 'none'
                                                        }}
                                                        styles={{ body: { padding: 8 } }}
                                                    >
                                                        <div style={{
                                                            position: 'relative',
                                                            display: 'inline-block'
                                                        }}>
                                                            <Image
                                                                src={image}
                                                                alt={`Face ${index + 1}`}
                                                                width={120}
                                                                height={120}
                                                                style={{
                                                                    objectFit: 'cover',
                                                                    borderRadius: 8
                                                                }}
                                                            />
                                                            <CloseCircleFilled
                                                                style={{
                                                                    position: 'absolute',
                                                                    top: 4,
                                                                    right: 4,
                                                                    fontSize: 18,
                                                                    color: '#ff4d4f',
                                                                    cursor: 'pointer',
                                                                    backgroundColor: 'white',
                                                                    borderRadius: '50%',
                                                                    zIndex: 10
                                                                }}
                                                                onClick={() => handleRemoveImage(index)}
                                                            />
                                                        </div>
                                                    </Card>
                                                ))}
                                            </div>
                                        )}
                                        <style>
                                            {`
                                                @media (max-width: 768px) {
                                                    .ant-card-body > div {
                                                        grid-template-columns: repeat(2, 1fr) !important;
                                                    }
                                                }
                                                @media (max-width: 480px) {
                                                    .ant-card-body > div {
                                                        grid-template-columns: repeat(2, 1fr) !important;
                                                    }
                                                }
                                            `}
                                        </style>
                                    </Card>

                                    <Card
                                        title="Tải lên ảnh mới"
                                        style={{
                                            marginBottom: 8,
                                            boxShadow: '0 2px 16px rgba(0,0,0,0.12)',
                                            borderRadius: 8,
                                        }}
                                        size="small"
                                    >
                                        <Dragger {...uploadProps}>
                                            <p className="ant-upload-drag-icon">
                                                <InboxOutlined />
                                            </p>
                                            <p className="ant-upload-text">Click hoặc kéo thả file vào đây</p>
                                            <p className="ant-upload-hint">
                                                Hỗ trợ tải lên đơn hoặc nhiều file. Kích thước tối đa 10MB/file.
                                            </p>
                                        </Dragger>

                                        <div style={{
                                            padding: 12,
                                            background: '#f5f5f5',
                                            borderRadius: 4,
                                            marginTop: 8
                                        }}>
                                            <p style={{ margin: 0, fontSize: 13, color: '#666' }}>
                                                <strong>Lưu ý:</strong>
                                            </p>
                                            <ul style={{ margin: '8px 0 0 0', paddingLeft: 20, fontSize: 13, color: '#666' }}>
                                                <li>Chỉ chấp nhận file ảnh (JPG, PNG, ...)</li>
                                                <li>Kích thước tối đa: 10MB/ảnh</li>
                                                <li>Tối đa 20 ảnh cho mỗi nhân viên</li>
                                                <li>Nên chụp ảnh khuôn mặt rõ ràng, nhiều góc độ khác nhau</li>
                                            </ul>
                                        </div>
                                    </Card>

                                    <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                                        <Button
                                            type="primary"
                                            icon={<SaveOutlined />}
                                            loading={loading}
                                            onClick={() => {
                                                setLoading(true);
                                                setTimeout(() => {
                                                    message.success('Lưu thư viện ảnh thành công');
                                                    setLoading(false);
                                                }, 1000);
                                            }}
                                        >
                                            Lưu thư viện
                                        </Button>
                                    </Space>
                                </>
                            ),
                        },
                    ]}
                />
            </Modal>

            <DepartmentModal
                open={departmentModalOpen}
                onClose={() => setDepartmentModalOpen(false)}
            />
        </>
    );
};

export default EmployeeManagementDetailModal;
