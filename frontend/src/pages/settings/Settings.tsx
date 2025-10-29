import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Space, message, Divider, Tag, Descriptions, Row, Col } from 'antd';
import { LockOutlined, SaveOutlined } from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';
import { settingsApi } from '@/api';

const Settings: React.FC = () => {
    const { user, setUser } = useAuth(); // Lấy user từ AuthContext
    const [profileForm] = Form.useForm();
    const [passwordForm] = Form.useForm();
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [loadingPassword, setLoadingPassword] = useState(false);

    // Load user data vào form khi component mount
    useEffect(() => {
        if (user) {
            profileForm.setFieldsValue({
                telegram: user.telegram_username || '',
            });
        }
    }, [user, profileForm]);



    // Hiển thị vai trò theo tiếng Việt
    const getRoleDisplay = (role?: string) => {
        switch (role) {
            case 'super_admin':
                return 'Super Admin';
            case 'admin':
                return 'Admin';
            case 'user':
                return 'User';
            default:
                return role || 'Không xác định';
        }
    };

    const handleUpdateProfile = async () => {
        if (!user) return;

        try {
            const values = await profileForm.validateFields();
            setLoadingProfile(true);

            // Gọi API cập nhật Telegram username
            await settingsApi.updateTelegramUsername(values.telegram);

            // Cập nhật user trong context
            setUser({
                ...user,
                telegram_username: values.telegram,
            });

            message.success('Cập nhật thông tin thành công!');
        } catch (error: any) {
            console.error('Lỗi khi cập nhật thông tin:', error);
            const errorMessage = error.response?.data?.detail || 
                                error.response?.data?.message || 
                                'Lỗi khi cập nhật thông tin';
            message.error(errorMessage);
        } finally {
            setLoadingProfile(false);
        }
    };

    const handleChangePassword = async () => {
        try {
            const values = await passwordForm.validateFields();
            setLoadingPassword(true);

            // Gọi API đổi mật khẩu
            await settingsApi.changePassword({
                current_password: values.currentPassword,
                new_password: values.newPassword,
            });

            message.success('Đổi mật khẩu thành công!');
            passwordForm.resetFields();
        } catch (error: any) {
            console.error('Lỗi khi đổi mật khẩu:', error);
            const errorMessage = error.response?.data?.detail || 
                                error.response?.data?.message || 
                                'Lỗi khi đổi mật khẩu';
            message.error(errorMessage);
        } finally {
            setLoadingPassword(false);
        }
    };

    // Nếu chưa có user data (vẫn đang loading)
    if (!user) {
        return (
            <div style={{ textAlign: 'center', padding: '50px' }}>
                Đang tải thông tin...
            </div>
        );
    }

    return (
        <Row gutter={[8, 8]}>
            {/* Cột trái: Thông tin nhân viên */}
            <Col xs={24} lg={12}>
                <Card
                    title={
                        <span style={{ fontSize: '16px' }}>
                            Thông tin nhân viên
                        </span>
                    }
                    style={{
                        height: '100%',
                        boxShadow: '0 2px 16px rgba(0,0,0,0.12)',
                    }}
                >
                    {/* Thông tin không thể chỉnh sửa */}
                    <Descriptions
                        bordered
                        column={1}
                        size="small"
                        style={{ 
                            marginBottom: '8px',
                         }}
                    >
                        <Descriptions.Item label="Tên nhân viên">
                            <strong>{user.full_name || user.username}</strong>
                        </Descriptions.Item>
                        <Descriptions.Item label="Email">
                            {user.email || 'Chưa có'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Vai trò">
                            <Tag color="blue">{getRoleDisplay(user.role)}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Chức vụ">
                            {user.position || 'Chưa có'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Phòng ban">
                            {user.department || 'Chưa có'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Trạng thái">
                            <Tag color={user.is_active ? 'green' : 'red'}>
                                {user.is_active ? 'Hoạt động' : 'Đã nghỉ'}
                            </Tag>
                        </Descriptions.Item>
                    </Descriptions>

                    <div style={{
                        padding: '8px 8px',
                        background: '#f0f0f0',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#666',
                        marginBottom: '16px'
                    }}>
                        <strong>Lưu ý:</strong> Các thông tin trên không thể tự chỉnh sửa. Liên hệ quản trị viên nếu cần thay đổi.
                    </div>

                    <Divider style={{ margin: '8px 0' }}>Thông tin liên hệ</Divider>

                    {/* Thông tin có thể chỉnh sửa */}
                    <Form
                        form={profileForm}
                        layout="vertical"
                    >
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

                        <Form.Item>
                            <Button
                                type="primary"
                                icon={<SaveOutlined />}
                                loading={loadingProfile}
                                onClick={handleUpdateProfile}
                                block
                            >
                                Lưu thay đổi
                            </Button>
                        </Form.Item>
                    </Form>
                </Card>
            </Col>

            {/* Cột phải: Đổi mật khẩu */}
            <Col xs={24} lg={12}>
                <Card
                    title={
                        <span style={{ fontSize: '16px' }}>
                            Đổi mật khẩu
                        </span>
                    }
                    style={{
                        height: '100%',
                        boxShadow: '0 2px 16px rgba(0,0,0,0.12)',
                    }}
                >
                    <Form
                        form={passwordForm}
                        layout="vertical"
                    >
                        <Form.Item
                            name="currentPassword"
                            label="Mật khẩu hiện tại"
                            rules={[
                                { required: true, message: 'Vui lòng nhập mật khẩu hiện tại!' }
                            ]}
                        >
                            <Input.Password
                                prefix={<LockOutlined />}
                                placeholder="Nhập mật khẩu hiện tại"
                            />
                        </Form.Item>

                        <Divider style={{ margin: '8px 0' }} />

                        <Form.Item
                            name="newPassword"
                            label="Mật khẩu mới"
                            rules={[
                                { required: true, message: 'Vui lòng nhập mật khẩu mới!' },
                                { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự!' },
                                // {
                                //     pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                                //     message: 'Mật khẩu phải chứa chữ hoa, chữ thường và số!'
                                // }
                            ]}
                            hasFeedback
                        >
                            <Input.Password
                                prefix={<LockOutlined />}
                                placeholder="Nhập mật khẩu mới"
                            />
                        </Form.Item>

                        <Form.Item
                            name="confirmPassword"
                            label="Xác nhận mật khẩu"
                            dependencies={['newPassword']}
                            hasFeedback
                            rules={[
                                { required: true, message: 'Vui lòng xác nhận mật khẩu!' },
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (!value || getFieldValue('newPassword') === value) {
                                            return Promise.resolve();
                                        }
                                        return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
                                    },
                                }),
                            ]}
                        >
                            <Input.Password
                                prefix={<LockOutlined />}
                                placeholder="Nhập lại mật khẩu mới"
                            />
                        </Form.Item>

                        <Form.Item>
                            <Space style={{ width: '100%' }} direction="vertical">
                                <Button
                                    type="primary"
                                    icon={<LockOutlined />}
                                    loading={loadingPassword}
                                    onClick={handleChangePassword}
                                    block
                                >
                                    Đổi mật khẩu
                                </Button>
                                <Button
                                    onClick={() => passwordForm.resetFields()}
                                    block
                                >
                                    Hủy
                                </Button>
                            </Space>
                        </Form.Item>
                    </Form>
                </Card>
            </Col>
        </Row>
    );
};

export default Settings;
