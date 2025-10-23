import React, { useState } from 'react';
import { Card, Form, Input, Button, Space, message, Divider, Tag, Descriptions, Row, Col } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined, SaveOutlined } from '@ant-design/icons';

const Settings: React.FC = () => {
    const [profileForm] = Form.useForm();
    const [passwordForm] = Form.useForm();
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [loadingPassword, setLoadingPassword] = useState(false);

    // Mock data - Trong thực tế sẽ fetch từ API
    const userData = {
        employeeName: 'Nguyễn Văn A',
        role: 'Admin',
        position: 'Dev AI',
        department: 'Tầng 2',
        status: 'active',
        email: 'nguyenvana@example.com',
        telegram: 'nguyenvana',
    };

    const handleUpdateProfile = async () => {
        try {
            const values = await profileForm.validateFields();
            setLoadingProfile(true);

            // Simulate API call
            setTimeout(() => {
                console.log('Updated profile:', values);
                message.success('Cập nhật thông tin thành công!');
                setLoadingProfile(false);
            }, 1000);
        } catch (error) {
            console.error('Validation failed:', error);
        }
    };

    const handleChangePassword = async () => {
        try {
            const values = await passwordForm.validateFields();
            setLoadingPassword(true);

            // Simulate API call
            setTimeout(() => {
                console.log('Changed password');
                message.success('Đổi mật khẩu thành công!');
                passwordForm.resetFields();
                setLoadingPassword(false);
            }, 1000);
        } catch (error) {
            console.error('Validation failed:', error);
        }
    };

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
                            <strong>{userData.employeeName}</strong>
                        </Descriptions.Item>
                        <Descriptions.Item label="Vai trò">
                            <Tag color="blue">{userData.role}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Chức vụ">
                            {userData.position}
                        </Descriptions.Item>
                        <Descriptions.Item label="Phòng ban">
                            {userData.department}
                        </Descriptions.Item>
                        <Descriptions.Item label="Trạng thái">
                            <Tag color={userData.status === 'active' ? 'green' : 'red'}>
                                {userData.status === 'active' ? 'Hoạt động' : 'Đã nghỉ'}
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
                        initialValues={{
                            email: userData.email,
                            telegram: userData.telegram,
                        }}
                    >
                        <Form.Item
                            name="email"
                            label="Email"
                            rules={[
                                { type: 'email', message: 'Email không hợp lệ!' },
                                { required: true, message: 'Vui lòng nhập email!' }
                            ]}
                        >
                            <Input
                                prefix={<MailOutlined />}
                                placeholder="Nhập email"
                            />
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

                    <div style={{
                        marginTop: '8px',
                        padding: '8px',
                        background: '#fff7e6',
                        border: '1px solid #ffd591',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#ad6800'
                    }}>
                        <strong>Yêu cầu mật khẩu:</strong>
                        <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', }}>
                            <li>Ít nhất 8 ký tự</li>
                            <li>Chứa ít nhất 1 chữ hoa (A-Z)</li>
                            <li>Chứa ít nhất 1 chữ thường (a-z)</li>
                            <li>Chứa ít nhất 1 chữ số (0-9)</li>
                        </ul>
                    </div>
                </Card>
            </Col>
        </Row>
    );
};

export default Settings;
