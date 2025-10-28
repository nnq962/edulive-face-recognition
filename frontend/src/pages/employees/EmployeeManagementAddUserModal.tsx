import React, { useState } from 'react';
import { Modal, Form, Input, Select, Button, Space, message } from 'antd';
import { SaveOutlined, SettingOutlined } from '@ant-design/icons';
import DepartmentModal from './DepartmentModal';
import { useDepartments } from '@/contexts/DepartmentsContext';
import { employeesApi } from '@/api'

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
    onAddSuccess?: () => void; // callback khi thêm nhân viên thành công để reload danh sách
}

const EmployeeManagementAddUserModal: React.FC<EmployeeManagementAddUserModalProps> = ({
    open,
    onClose,
    onAddSuccess,
}) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    // Department management states
    const [departmentModalOpen, setDepartmentModalOpen] = useState(false);
    const { departments, loading: departmentsLoading, reload } = useDepartments();

    const handleAdd = async () => {
        try {
            const values = await form.validateFields();
            console.log("Form values:", values);
            setLoading(true);

            // Map form field -> backend field
            const payload = {
                full_name: values.employeeName,
                role: values.role,
                position: values.position,
                department: values.department,
                telegram_username: values.telegram || undefined,
            };

            const response = await employeesApi.addUser(payload);
            console.log("API Response:", response.data);
            message.success("Thêm nhân viên thành công");
            form.resetFields();
            onClose();
            if (onAddSuccess) {
                onAddSuccess();
            }
        } catch (error: any) {
            console.error("Validation failed:", error);
            message.error(error.response?.data?.message || "Không thể thêm nhân viên");
        } finally {
            setLoading(false);
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
