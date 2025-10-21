import React, { useState, useEffect } from 'react';
import { Modal, Table, Button, Space, Input, Form, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

interface Department {
    key: string;
    name: string;
}

interface DepartmentModalProps {
    open: boolean;
    onClose: () => void;
    departments: string[];
    onUpdate: (departments: string[]) => void;
}

const DepartmentModal: React.FC<DepartmentModalProps> = ({
    open,
    onClose,
    departments,
    onUpdate,
}) => {
    const [form] = Form.useForm();
    const [dataSource, setDataSource] = useState<Department[]>([]);
    const [editingKey, setEditingKey] = useState<string>('');
    const [addingNew, setAddingNew] = useState(false);

    useEffect(() => {
        if (open) {
            // Convert departments array to table data
            const data = departments.map((dept, index) => ({
                key: `dept-${index}`,
                name: dept,
            }));
            setDataSource(data);
            setEditingKey('');
            setAddingNew(false);
        }
    }, [open, departments]);

    const isEditing = (record: Department) => record.key === editingKey;

    const handleEdit = (record: Department) => {
        form.setFieldsValue({ name: record.name });
        setEditingKey(record.key);
    };

    const handleCancel = () => {
        setEditingKey('');
        setAddingNew(false);
        form.resetFields();
    };

    const handleSave = async (key: string) => {
        try {
            const values = await form.validateFields();
            const newName = values.name.trim();

            // Check duplicate
            const isDuplicate = dataSource.some(
                item => item.key !== key && item.name.toLowerCase() === newName.toLowerCase()
            );

            if (isDuplicate) {
                message.error('Tên phòng ban đã tồn tại!');
                return;
            }

            const newData = [...dataSource];
            const index = newData.findIndex(item => key === item.key);

            if (index > -1) {
                newData[index].name = newName;
                setDataSource(newData);
                setEditingKey('');
                form.resetFields();
                message.success('Cập nhật phòng ban thành công');
            }
        } catch (error) {
            console.error('Validation failed:', error);
        }
    };

    const handleDelete = (key: string) => {
        const newData = dataSource.filter(item => item.key !== key);
        setDataSource(newData);
        message.success('Xóa phòng ban thành công');
    };

    const handleAddNew = () => {
        const newKey = `dept-new-${Date.now()}`;
        const newDepartment: Department = {
            key: newKey,
            name: '',
        };

        setDataSource([...dataSource, newDepartment]);
        setEditingKey(newKey);
        setAddingNew(true);
        form.setFieldsValue({ name: '' });

        // Scroll to bottom
        setTimeout(() => {
            const tableBody = document.querySelector('.ant-table-body');
            if (tableBody) {
                tableBody.scrollTop = tableBody.scrollHeight;
            }
        }, 100);
    };

    const handleSaveNew = async () => {
        try {
            const values = await form.validateFields();
            const newName = values.name.trim();

            // Check duplicate
            const isDuplicate = dataSource.some(
                item => item.key !== editingKey && item.name.toLowerCase() === newName.toLowerCase()
            );

            if (isDuplicate) {
                message.error('Tên phòng ban đã tồn tại!');
                return;
            }

            const newData = [...dataSource];
            const index = newData.findIndex(item => item.key === editingKey);

            if (index > -1) {
                newData[index].name = newName;
                setDataSource(newData);
                setEditingKey('');
                setAddingNew(false);
                form.resetFields();
                message.success('Thêm phòng ban thành công');
            }
        } catch (error) {
            console.error('Validation failed:', error);
        }
    };

    const handleCancelNew = () => {
        const newData = dataSource.filter(item => item.key !== editingKey);
        setDataSource(newData);
        setEditingKey('');
        setAddingNew(false);
        form.resetFields();
    };

    const handleOk = () => {
        if (editingKey) {
            message.warning('Vui lòng lưu hoặc hủy chỉnh sửa trước khi đóng!');
            return;
        }

        // Update departments list
        const updatedDepartments = dataSource.map(item => item.name);
        onUpdate(updatedDepartments);
        message.success('Đã lưu danh sách phòng ban');
        onClose();
    };

    const columns: ColumnsType<Department> = [
        {
            title: 'STT',
            key: 'index',
            width: 60,
            align: 'center',
            render: (_: any, __: Department, index: number) => index + 1,
        },
        {
            title: 'Tên phòng ban',
            dataIndex: 'name',
            key: 'name',
            render: (_: any, record: Department) => {
                const editable = isEditing(record);
                return editable ? (
                    <Form form={form} component={false}>
                        <Form.Item
                            name="name"
                            style={{ margin: 0 }}
                            rules={[
                                { required: true, message: 'Vui lòng nhập tên phòng ban!' },
                                { whitespace: true, message: 'Tên không được chỉ chứa khoảng trắng!' },
                                { min: 2, message: 'Tên phòng ban phải có ít nhất 2 ký tự!' },
                            ]}
                        >
                            <Input placeholder="Nhập tên phòng ban" autoFocus />
                        </Form.Item>
                    </Form>
                ) : (
                    <span>{record.name}</span>
                );
            },
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: 150,
            align: 'center',
            render: (_: any, record: Department) => {
                const editable = isEditing(record);
                return editable ? (
                    <Space size="small">
                        <Button
                            type="primary"
                            size="small"
                            icon={<SaveOutlined />}
                            onClick={() => addingNew ? handleSaveNew() : handleSave(record.key)}
                        >
                            Lưu
                        </Button>
                        <Button
                            size="small"
                            icon={<CloseOutlined />}
                            onClick={() => addingNew ? handleCancelNew() : handleCancel()}
                        >
                            Hủy
                        </Button>
                    </Space>
                ) : (
                    <Space size="small">
                        <Button
                            type="link"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => handleEdit(record)}
                            disabled={editingKey !== ''}
                        >
                            Sửa
                        </Button>
                        <Popconfirm
                            title="Xóa phòng ban"
                            description="Bạn có chắc chắn muốn xóa phòng ban này?"
                            onConfirm={() => handleDelete(record.key)}
                            okText="Xóa"
                            cancelText="Hủy"
                            okButtonProps={{ danger: true }}
                            disabled={editingKey !== ''}
                        >
                            <Button
                                type="link"
                                danger
                                size="small"
                                icon={<DeleteOutlined />}
                                disabled={editingKey !== ''}
                            >
                                Xóa
                            </Button>
                        </Popconfirm>
                    </Space>
                );
            },
        },
    ];

    return (
        <Modal
            title="Quản lý phòng ban"
            centered
            open={open}
            onCancel={() => {
                if (editingKey) {
                    message.warning('Vui lòng lưu hoặc hủy chỉnh sửa trước khi đóng!');
                    return;
                }
                onClose();
            }}
            onOk={handleOk}
            width={{
                xs: '90%',
                sm: '80%',
                md: '70%',
                lg: '60%',
                xl: '50%',
                xxl: '40%',
            }}
            okText="Hoàn thành"
            cancelText="Đóng"
            cancelButtonProps={{ style: { display: 'none' } }}
        >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    onClick={handleAddNew}
                    disabled={editingKey !== ''}
                    block
                >
                    Thêm phòng ban mới
                </Button>

                <Table
                    dataSource={dataSource}
                    columns={columns}
                    pagination={false}
                    size="small"
                    bordered
                    scroll={{ y: 400 }}
                    locale={{
                        emptyText: 'Chưa có phòng ban nào. Nhấn "Thêm phòng ban mới" để bắt đầu.',
                    }}
                />

                <div style={{
                    padding: '12px',
                    background: '#f5f5f5',
                    borderRadius: '4px',
                    fontSize: '13px',
                    color: '#666',
                }}>
                    <strong>Lưu ý:</strong>
                    <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                        <li>Nhấn "Thêm phòng ban mới" để tạo phòng ban</li>
                        <li>Nhấn "Sửa" để chỉnh sửa tên phòng ban</li>
                        <li>Nhấn "Xóa" để xóa phòng ban (lưu ý: nhân viên thuộc phòng ban này sẽ cần được cập nhật lại)</li>
                        <li>Nhấn "Hoàn thành" để lưu tất cả thay đổi</li>
                    </ul>
                </div>
            </Space>
        </Modal>
    );
};

export default DepartmentModal;
