import React, { useState } from 'react';
import { Modal, Form, Input, Select, Button, Space, message } from 'antd';
import { SaveOutlined, SettingOutlined } from '@ant-design/icons';
import DepartmentModal from './DepartmentModal';
import { useDepartments } from '@/contexts/DepartmentsContext';

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

interface EmployeeManagementAddUserModalProps {
    open: boolean;
    onClose: () => void;
    onAdd?: (data: Omit<EmployeeData, 'key'>) => void;
}

const EmployeeManagementAddUserModal: React.FC<EmployeeManagementAddUserModalProps> = ({
    open,
    onClose,
    onAdd,
}) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    // Department management states
    const [departmentModalOpen, setDepartmentModalOpen] = useState(false);
    const { departments, loading: departmentsLoading, reload } = useDepartments();

    const handleAdd = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);

            // Simulate API call
            setTimeout(() => {
                const newEmployee: Omit<EmployeeData, 'key'> = {
                    ...values,
                };

                if (onAdd) {
                    onAdd(newEmployee);
                }

                message.success('Thêm nhân viên thành công');
                setLoading(false);
                form.resetFields();
                onClose();
            }, 1000);
        } catch (error) {
            console.error('Validation failed:', error);
        }
    };

    const handleCancel = () => {
        form.resetFields();
        onClose();
    };

    return (
        <>
            <Modal
                title="Thêm nhân viên mới"
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
                <Form
                    form={form}
                    layout="horizontal"
                    labelCol={{ xs: { span: 24 }, sm: { span: 8 } }}
                    wrapperCol={{ xs: { span: 24 }, sm: { span: 16 } }}
                    style={{ maxWidth: 600 }}
                    initialValues={{
                        status: 'active', // Mặc định là hoạt động
                    }}
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
                            <Option value="User">User</Option>
                            <Option value="Admin">Admin</Option>
                            <Option value="Super Admin">Super Admin</Option>
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
                        name="department"
                        label="Phòng ban"
                        rules={[{ required: true, message: 'Vui lòng chọn phòng ban!' }]}
                    >
                        <Space.Compact style={{ width: '100%' }}>
                            <Select
                                placeholder="Chọn phòng ban"
                                style={{ width: '100%' }}
                                loading={departmentsLoading}
                            >
                                {departments.map(dept => (
                                    <Option key={dept.id} value={dept.name}>{dept.name}</Option>
                                ))}
                            </Select>
                            <Button
                                icon={<SettingOutlined />}
                                onClick={() => setDepartmentModalOpen(true)}
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

                <Space style={{ width: '100%', justifyContent: 'flex-end', marginTop: 16 }}>
                    <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        loading={loading}
                        onClick={handleAdd}
                    >
                        Thêm nhân viên
                    </Button>
                </Space>
            </Modal>

            {/* Department Management Modal */}
            <DepartmentModal
                open={departmentModalOpen}
                onClose={() => setDepartmentModalOpen(false)}
            />
        </>
    );
};

export default EmployeeManagementAddUserModal;
