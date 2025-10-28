import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Button, Space, message, Popconfirm, Tabs, Upload, Image, Card } from 'antd';
import { DeleteOutlined, SaveOutlined, InboxOutlined, CloseCircleFilled, SettingOutlined } from '@ant-design/icons';
import type { UploadProps, UploadFile } from 'antd/es/upload/interface';
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
    const [images, setImages] = useState<{ filename: string; url: string }[]>([]);
    const [loadingImages, setLoadingImages] = useState(false);
    const [uploadingImages, setUploadingImages] = useState(false);
    const [fileList, setFileList] = useState<UploadFile[]>([]);

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

            setActiveTab('1');
            
            // Load images khi mở modal
            if (employeeData.key) {
                fetchUserFaces(employeeData.key);
            }
        }
    }, [employeeData, open, departments, form]);

    // Fetch danh sách ảnh khuôn mặt của user
    const fetchUserFaces = async (userId: string) => {
        try {
            setLoadingImages(true);
            const response = await employeesApi.getUserFaces(userId);
            
            console.log('User faces response:', response.data);
            
            // Backend trả về: { success: true, data: ["face_xxx.jpg", ...] }
            const faceFiles = response.data.data || [];
            
            // Load từng ảnh qua API (có token)
            const loadedImages = await Promise.all(
                faceFiles.map(async (filename: string) => {
                    try {
                        // Gọi API viewUserFace qua axios (có token trong header)
                        const imageResponse = await employeesApi.viewUserFace(userId, filename);
                        
                        // Tạo blob URL từ response data
                        const blob = new Blob([imageResponse.data], { type: 'image/jpeg' });
                        const objectUrl = URL.createObjectURL(blob);
                        
                        return {
                            filename,
                            url: objectUrl,
                        };
                    } catch (error) {
                        console.error(`Lỗi khi load ảnh ${filename}:`, error);
                        return {
                            filename,
                            url: '',
                        };
                    }
                })
            );
            
            setImages(loadedImages.filter(img => img.url !== ''));
        } catch (error: any) {
            console.error('Lỗi khi tải ảnh khuôn mặt:', error);
            setImages([]);
        } finally {
            setLoadingImages(false);
        }
    };

    // Xóa ảnh khuôn mặt
    const handleRemoveImage = async (filename: string) => {
        if (!employeeData) return;

        try {
            setLoadingImages(true);
            
            await employeesApi.deleteUserFace(employeeData.key, filename);
            
            message.success('Đã xóa ảnh thành công');
            
            // Reload lại danh sách ảnh
            await fetchUserFaces(employeeData.key);
        } catch (error: any) {
            console.error('Lỗi khi xóa ảnh:', error);
            const errorMessage = error.response?.data?.detail || 
                                error.response?.data?.message || 
                                'Lỗi khi xóa ảnh';
            message.error(errorMessage);
        } finally {
            setLoadingImages(false);
        }
    };

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
        
        // Cleanup: Revoke object URLs để giải phóng memory
        images.forEach(image => {
            if (image.url && image.url.startsWith('blob:')) {
                URL.revokeObjectURL(image.url);
            }
        });
        
        setImages([]);
        setFileList([]);
        onClose();
    };

    const uploadProps: UploadProps = {
        name: 'files',
        multiple: true,
        fileList: fileList,
        beforeUpload: (file) => {
            const isImage = file.type.startsWith('image/');
            if (!isImage) {
                message.error('Bạn chỉ có thể upload file ảnh!');
                return false;
            }
            const isLt10M = file.size / 1024 / 1024 < 10;
            if (!isLt10M) {
                message.error('Kích thước file phải nhỏ hơn 10MB!');
                return false;
            }
            
            // Thêm file vào fileList với originFileObj chính xác
            setFileList(prev => [...prev, {
                uid: file.uid,
                name: file.name,
                status: 'done',
                originFileObj: file,
            } as UploadFile]);
            
            // Không upload tự động
            return false;
        },
        onRemove: (file) => {
            setFileList(prev => prev.filter(f => f.uid !== file.uid));
        },
        showUploadList: {
            showRemoveIcon: true,
            showPreviewIcon: false,
        },
    };

    // Upload ảnh
    const handleUploadImages = async () => {
        if (!employeeData) return;
        if (fileList.length === 0) {
            message.warning('Vui lòng chọn ít nhất 1 ảnh để upload');
            return;
        }

        try {
            setUploadingImages(true);

            // Convert fileList to File[]
            const files: File[] = [];
            for (const fileItem of fileList) {
                if (fileItem.originFileObj) {
                    files.push(fileItem.originFileObj as File);
                }
            }

            if (files.length === 0) {
                message.error('Không có file hợp lệ để upload');
                return;
            }

            console.log('Uploading files:', files.map(f => ({ name: f.name, type: f.type, size: f.size })));

            const response = await employeesApi.uploadUserFaces(employeeData.key, files);

            console.log('Upload response:', response.data);

            // Backend trả về: { success, message, data: [...], meta: {...} }
            const { data, meta } = response.data;

            // Hiển thị kết quả
            if (meta.valid_count > 0) {
                message.success(`Đã upload thành công ${meta.valid_count} ảnh!`);
            }

            if (meta.invalid_count > 0) {
                // Hiển thị chi tiết các file không hợp lệ
                const invalidDetails = meta.invalid_files
                    .map((f: any) => `${f.file}: ${f.reason}`)
                    .join('\n');
                
                message.warning({
                    content: (
                        <div>
                            <div style={{ marginBottom: 8 }}>
                                <strong>{meta.invalid_count} ảnh không hợp lệ</strong>
                            </div>
                            <div style={{ fontSize: 12, whiteSpace: 'pre-line' }}>
                                {invalidDetails}
                            </div>
                        </div>
                    ),
                    duration: 8,
                });
            }

            // Clear fileList
            setFileList([]);

            // Reload lại danh sách ảnh
            await fetchUserFaces(employeeData.key);

        } catch (error: any) {
            console.error('Lỗi khi upload ảnh:', error);
            const errorMessage = error.response?.data?.detail || 
                                error.response?.data?.message || 
                                'Lỗi khi upload ảnh';
            message.error(errorMessage);
        } finally {
            setUploadingImages(false);
        }
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
                                        loading={loadingImages}
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
                                                                src={image.url}
                                                                alt={`Face ${index + 1}`}
                                                                width={120}
                                                                height={120}
                                                                style={{
                                                                    objectFit: 'cover',
                                                                    borderRadius: 8
                                                                }}
                                                                preview={{
                                                                    mask: 'Xem ảnh'
                                                                }}
                                                            />
                                                            <Popconfirm
                                                                title="Xóa ảnh"
                                                                description="Bạn có chắc chắn muốn xóa ảnh này?"
                                                                onConfirm={() => handleRemoveImage(image.filename)}
                                                                okText="Xóa"
                                                                cancelText="Hủy"
                                                                okButtonProps={{ danger: true }}
                                                            >
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
                                                                />
                                                            </Popconfirm>
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
                                                <li>Chỉ chấp nhận file ảnh (JPG, PNG, HEIC, ...)</li>
                                                <li>Kích thước tối đa: 10MB/ảnh</li>
                                                <li>Mỗi ảnh chỉ được có <strong>1 khuôn mặt</strong></li>
                                                <li>Ảnh có nhiều hơn 1 khuôn mặt hoặc không có khuôn mặt sẽ bị từ chối</li>
                                                <li>Nên chụp ảnh khuôn mặt rõ ràng, nhiều góc độ khác nhau</li>
                                            </ul>
                                        </div>
                                    </Card>

                                    <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                                        <Button
                                            type="primary"
                                            icon={<SaveOutlined />}
                                            loading={uploadingImages}
                                            onClick={handleUploadImages}
                                            disabled={fileList.length === 0}
                                        >
                                            Upload {fileList.length > 0 ? `(${fileList.length})` : ''}
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
