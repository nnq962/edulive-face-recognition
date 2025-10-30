import React, { useState, useEffect } from 'react';
import { Modal, Table, Button, Space, Input, Form, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { departmentsApi } from '@/api';
import { useDepartments } from '@/contexts/DepartmentsContext';


interface Department {
    key: string;
    id: string;
    name: string;
}

interface DepartmentModalProps {
    open: boolean;
    onClose: () => void;
}

const DepartmentModal: React.FC<DepartmentModalProps> = ({
    open,
    onClose,
}) => {
    const [form] = Form.useForm();
    const [dataSource, setDataSource] = useState<Department[]>([]);
    const [editingKey, setEditingKey] = useState<string>('');
    const [addingNew, setAddingNew] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const { departments, loading: fetchLoading, reload } = useDepartments();

    useEffect(() => {
        if (open) {
            reload();
            setEditingKey('');
            setAddingNew(false);
        }
    }, [open, reload]);

    useEffect(() => {
        if (departments) {
            const data: Department[] = departments.map((dept: any) => ({
                key: dept.id,
                id: dept.id,
                name: dept.name,
            }));
            setDataSource(data);
        }
    }, [departments]);

    const loading = fetchLoading || actionLoading;

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

            setActionLoading(true);

            // Gọi API update
            const department = dataSource.find(item => item.key === key);
            if (!department) return;

            await departmentsApi.updateDepartment({
                id: department.id,
                name: newName,
            });

            message.success('Update department successful');

            // Reload lại danh sách
            await reload();

            setEditingKey('');
            form.resetFields();

        } catch (error: any) {
            console.error('Error updating department:', error);
            const errorMessage = error.response?.data?.detail || 
                                error.response?.data?.message || 
                                'Failed to update department';
            message.error(errorMessage);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (record: Department) => {
        try {
            setActionLoading(true);

            // Gọi API delete
            await departmentsApi.deleteDepartment({ id: record.id });

            message.success('Delete department successful');

            // Reload lại danh sách
            await reload();

        } catch (error: any) {
            console.error('Error deleting department:', error);
            const errorMessage = error.response?.data?.detail || 
                                error.response?.data?.message || 
                                'Failed to delete department';
            message.error(errorMessage);
        } finally {
            setActionLoading(false);
        }
    };

    const handleAddNew = () => {
        const newKey = `dept-new-${Date.now()}`;
        const newDepartment: Department = {
            key: newKey,
            id: '', // Chưa có ID vì chưa tạo
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

            setActionLoading(true);

            // Gọi API create
            await departmentsApi.createDepartment({ name: newName });

            message.success('Add department successful');

            // Reload lại danh sách
            await reload();

            setEditingKey('');
            setAddingNew(false);
            form.resetFields();

        } catch (error: any) {
            console.error('Error adding department:', error);
            const errorMessage = error.response?.data?.detail || 
                                error.response?.data?.message || 
                                'Failed to add department';
            message.error(errorMessage);
        } finally {
            setActionLoading(false);
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
            message.warning('Please save or cancel editing before closing!');
            return;
        }

        // Đóng modal
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
                            loading={loading}
                            onClick={() => addingNew ? handleSaveNew() : handleSave(record.key)}
                        >
                            Lưu
                        </Button>
                        <Button
                            size="small"
                            icon={<CloseOutlined />}
                            disabled={loading}
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
                            disabled={editingKey !== '' || loading}
                        >
                            Sửa
                        </Button>
                        <Popconfirm
                            title="Xóa phòng ban"
                            description="Bạn có chắc chắn muốn xóa phòng ban này?"
                            onConfirm={() => handleDelete(record)}
                            okText="Xóa"
                            cancelText="Hủy"
                            okButtonProps={{ danger: true, loading }}
                            disabled={editingKey !== '' || loading}
                        >
                            <Button
                                type="link"
                                danger
                                size="small"
                                icon={<DeleteOutlined />}
                                disabled={editingKey !== '' || loading}
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
                    message.warning('Please save or cancel editing before closing!');
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
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
                <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    onClick={handleAddNew}
                    disabled={editingKey !== '' || loading}
                    block
                    style={{
                        boxShadow: '0 2px 16px rgba(0,0,0,0.12)',
                        borderRadius: 8,
                    }}
                >
                    Thêm phòng ban mới
                </Button>

                <Table
                    dataSource={dataSource}
                    columns={columns}
                    loading={loading}
                    pagination={false}
                    size="small"
                    bordered
                    scroll={{ y: 400 }}
                    locale={{
                        emptyText: 'Chưa có phòng ban nào. Nhấn "Thêm phòng ban mới" để bắt đầu.',
                    }}
                    style={{
                        boxShadow: '0 2px 16px rgba(0,0,0,0.12)',
                        borderRadius: '8px 8px 8px 8px',
                        overflow: 'hidden',
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
                    <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', borderRadius: 8 }}>
                        <li>Nhấn "Thêm phòng ban mới" để tạo phòng ban</li>
                        <li>Nhấn "Sửa" để chỉnh sửa tên phòng ban (tự động cập nhật cho tất cả nhân viên)</li>
                        <li>Nhấn "Xóa" để xóa phòng ban (chỉ xóa được nếu không có nhân viên nào thuộc phòng ban này)</li>
                        <li>Thay đổi được lưu ngay lập tức, không cần nhấn "Hoàn thành"</li>
                    </ul>
                </div>
            </Space>
        </Modal>
    );
};

export default DepartmentModal;
