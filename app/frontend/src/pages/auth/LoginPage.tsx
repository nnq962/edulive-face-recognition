import React from 'react';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Checkbox, Form, Input, Flex, Typography, Card } from 'antd';

const LoginPage: React.FC = () => {
    const onFinish = (values: any) => {
        console.log('Received values of form: ', values);
    };

    return (
        <Flex
            vertical
            align="center"
            justify="center"
            style={{
                minHeight: '100vh',
                background: '#f5f5f5',
                padding: '16px',
            }}
        >
            <Card
                style={{
                    width: 360,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                    border: 'none', // bỏ viền bằng CSS
                }}
            >
                <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: 24 }}>
                    Đăng nhập
                </Typography.Title>

                <Form
                    name="login"
                    initialValues={{ remember: true }}
                    layout="vertical"
                    onFinish={onFinish}
                >
                    <Form.Item
                        name="username"
                        rules={[{ required: true, message: 'Vui lòng nhập username!' }]}
                    >
                        <Input prefix={<UserOutlined />} placeholder="Username" size="large" />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[{ required: true, message: 'Vui lòng nhập password!' }]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
                    </Form.Item>

                    <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
                        <Form.Item name="remember" valuePropName="checked" noStyle>
                            <Checkbox>Ghi nhớ</Checkbox>
                        </Form.Item>
                        <a href="#">Quên mật khẩu?</a>
                    </Flex>

                    <Button block type="primary" htmlType="submit" size="large">
                        Đăng nhập
                    </Button>
                </Form>
            </Card>
        </Flex>
    );
};

export default LoginPage;