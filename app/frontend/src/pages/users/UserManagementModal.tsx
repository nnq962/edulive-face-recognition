import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Switch, Space, Popconfirm, Button } from 'antd';

export type UserRecord = {
  key: React.Key;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'user' | string;
  position: string;
  department: string;
  created_at: string;
  active: boolean;
};

type Props = {
  open: boolean;
  user?: UserRecord | null;
  loading?: boolean;
  onCancel: () => void;
  onSave: (values: UserRecord) => void;
  onDelete: (user: UserRecord) => void;
};

const UserManagementModal: React.FC<Props> = ({
  open,
  user,
  loading = false,
  onCancel,
  onSave,
  onDelete,
}) => {
  const [form] = Form.useForm<UserRecord>();
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (user) {
      form.setFieldsValue(user);
      setEditMode(false); // mở modal mặc định chế độ xem
    } else {
      form.resetFields();
      setEditMode(true); // nếu tạo mới thì bật edit
    }
  }, [user, form, open]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      // merge lại key/created_at nếu cần
      const payload: UserRecord = { ...(user as UserRecord), ...values };
      onSave(payload);
      setEditMode(false);
    } catch {
      // validate fail -> do nothing
    }
  };

  const footer = (
    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
      {/* Xoá */}
      {user && (
        <Popconfirm
          title="Xoá người dùng"
          description={`Bạn chắc muốn xoá ${user.name}?`}
          okText="Xoá"
          cancelText="Huỷ"
          onConfirm={() => onDelete(user)}
        >
          <Button danger>Xoá</Button>
        </Popconfirm>
      )}

      <Space>
        <Button onClick={onCancel}>Đóng</Button>
        {!editMode ? (
          <Button type="primary" onClick={() => setEditMode(true)}>
            Chỉnh sửa
          </Button>
        ) : (
          <Button type="primary" loading={loading} onClick={handleOk}>
            Lưu
          </Button>
        )}
      </Space>
    </Space>
  );

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      title={user ? `Quản lý: ${user.name}` : 'Thêm người dùng'}
      footer={footer}
      destroyOnClose
      maskClosable={false}
    >
      <Form
        form={form}
        layout="vertical"
        disabled={!editMode} // khoá form ở chế độ xem
      >
        <Form.Item name="name" label="Tên" rules={[{ required: true, message: 'Nhập tên' }]}>
          <Input placeholder="Nhập tên" />
        </Form.Item>

        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: 'Nhập email' },
            { type: 'email', message: 'Email không hợp lệ' },
          ]}
        >
          <Input placeholder="name@example.com" />
        </Form.Item>

        <Form.Item name="role" label="Vai trò" rules={[{ required: true }]}>
          <Select
            options={[
              { label: 'admin', value: 'admin' },
              { label: 'manager', value: 'manager' },
              { label: 'user', value: 'user' },
            ]}
            placeholder="Chọn vai trò"
          />
        </Form.Item>

        <Form.Item name="active" label="Trạng thái" valuePropName="checked">
          <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
        </Form.Item>

        <Form.Item name="position" label="Chức vụ">
          <Input placeholder="VD: Dev AI" />
        </Form.Item>

        <Form.Item name="department" label="Phòng ban">
          <Input placeholder="VD: T1" />
        </Form.Item>

        {/* created_at chỉ hiển thị (không sửa) */}
        <Form.Item label="Tạo lúc">
          <Input value={user?.created_at} disabled />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default UserManagementModal;