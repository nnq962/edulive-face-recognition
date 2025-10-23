import React, { useState } from 'react';
import { Card, Form, Input, Button, message, Typography, Checkbox } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title } = Typography;

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values: { username: string; password: string }) => {
    try {
      setLoading(true);
      // fake auth
      if (!values.username || !values.password) throw new Error('invalid');
      localStorage.setItem('token', 'demo-token');
      message.success('Đăng nhập thành công');
      navigate('/', { replace: true });
    } catch {
      message.error('Sai tài khoản/mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden', // Khóa scroll dọc và ngang
        position: 'fixed',
        top: 0,
        left: 0,
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: '420px',
          margin: '20px',
          boxShadow: '0 2px 16px rgba(0,0,0,0.12)'

        }}
      >
        {/* Tiêu đề ở giữa */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Title level={3} style={{ margin: 0 }}>
            Hệ thống chấm công
          </Title>
        </div>

        <Form
          layout="vertical"
          onFinish={onFinish}
          autoComplete="off"
        >
          <Form.Item
            name="username"
            rules={[
              { required: true, message: 'Vui lòng nhập tài khoản!' },
              { whitespace: true, message: 'Tài khoản không được chỉ chứa khoảng trắng!' }
            ]}
          >
            <Input
              prefix={<UserOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
              placeholder="Tài khoản"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu!' },
              { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự!' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
              placeholder="Mật khẩu"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox>Ghi nhớ đăng nhập</Checkbox>
              </Form.Item>
              <a href="#" style={{ color: '#1890ff' }}>
                Quên mật khẩu?
              </a>
            </div>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
              style={{
                marginTop: '8px',
                height: '45px',
                fontSize: '16px',
                fontWeight: 500,
              }}
            >
              Đăng nhập
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* CSS để khóa scroll toàn cục */}
      <style>{`
        body {
          overflow: hidden !important;
        }
      `}</style>
    </div>
  );
};

export default Login;
