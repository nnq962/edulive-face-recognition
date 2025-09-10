// src/pages/users/UsersPage.tsx
import React from 'react';
import { Table, Tag, Popconfirm, message, Typography, Space, Button, Tooltip } from 'antd';
import type { TableColumnsType } from 'antd';
import { createStyles } from 'antd-style';

const { Text } = Typography;
const { Title } = Typography;

const useStyle = createStyles(({ css }) => ({
    customTable: css`
      /* ===== ẨN SCROLLBAR THEO CHIỀU NGANG VÀ DỌC ===== */
  
      /* Firefox - ẩn scrollbar ngang và dọc */
      .ant-table-container .ant-table-body,
      .ant-table-container .ant-table-content,
      .ant-table-container .ant-table-header {
        scrollbar-width: none !important;        /* ẩn thanh cuộn */
        -ms-overflow-style: none !important;     /* IE/Edge cũ */
      }
  
      /* WebKit (Chrome/Edge/Safari) - ẩn scrollbar ngang và dọc */
      .ant-table-container .ant-table-body::-webkit-scrollbar,
      .ant-table-container .ant-table-content::-webkit-scrollbar,
      .ant-table-container .ant-table-header::-webkit-scrollbar,
      .ant-table-container .ant-table-body-inner::-webkit-scrollbar,
      .ant-table-wrapper .ant-table-container::-webkit-scrollbar {
        width: 0 !important;
        height: 0 !important;
        display: none !important;               /* ẩn hẳn */
        background: transparent !important;
      }

      /* Ẩn scrollbar ngang cho toàn bộ table wrapper */
      &::-webkit-scrollbar {
        width: 0 !important;
        height: 0 !important;
        display: none !important;
      }

      /* Ẩn scrollbar cho các phần tử con có thể có scroll */
      * {
        &::-webkit-scrollbar {
          width: 0 !important;
          height: 0 !important;
          display: none !important;
        }
        scrollbar-width: none !important;
        -ms-overflow-style: none !important;
      }
  
      /* ===== ẨN STICKY SCROLLBAR HELPER Ở ĐÁY (AntD) ===== */
      .ant-table-sticky-scroll,
      .ant-table-sticky-scroll-bar {
        display: none !important;     /* ẩn cả wrapper lẫn bar */
      }

      /* ===== ẨN SCROLLBAR CHO TABLE CONTAINER ===== */
      .ant-table {
        &::-webkit-scrollbar {
          width: 0 !important;
          height: 0 !important;
          display: none !important;
        }
        scrollbar-width: none !important;
        -ms-overflow-style: none !important;
      }
    `,
}));

interface DataType {
    key: React.Key;
    name: string;
    email: string;
    role: 'admin' | 'manager' | 'user' | string;
    position: string;
    department: string;
    created_at: string;
    active: boolean;
}

const dataSource: DataType[] = [
    { key: '1', name: 'Nguyên Văn A Nguyên Văn A Nguyên Văn A Nguyên Văn A Nguyên Văn A', email: '123456789@edulive.net', role: 'admin', position: 'Dev AI', department: 'T1', created_at: '2025-09-10 09:30', active: true },
    { key: '2', name: 'Trần Văn B', email: '1234567@edulive.net', role: 'manager', position: 'Dev FrontEnd', department: 'T2', created_at: '2025-09-10 09:30', active: false },
    { key: '3', name: 'Nguyễn Ngọc Quyết', email: '1234567@edulive.net', role: 'user', position: 'Công nhân', department: 'T3', created_at: '2025-09-10 09:30', active: false },
    { key: '4', name: 'Nguyên Văn A Nguyên Văn A Nguyên Văn A Nguyên Văn A Nguyên Văn A', email: '123456789@edulive.net', role: 'admin', position: 'Dev AI', department: 'T1', created_at: '2025-09-10 09:30', active: true },
    { key: '5', name: 'Trần Văn B', email: '1234567@edulive.net', role: 'manager', position: 'Dev FrontEnd', department: 'T2', created_at: '2025-09-10 09:30', active: false },
    { key: '6', name: 'Nguyễn Ngọc Quyết', email: '1234567@edulive.net', role: 'user', position: 'Công nhân', department: 'T3', created_at: '2025-09-10 09:30', active: false },
    { key: '7', name: 'Nguyên Văn A Nguyên Văn A Nguyên Văn A Nguyên Văn A Nguyên Văn A', email: '123456789@edulive.net', role: 'admin', position: 'Dev AI', department: 'T1', created_at: '2025-09-10 09:30', active: true },
    { key: '8', name: 'Trần Văn B', email: '1234567@edulive.net', role: 'manager', position: 'Dev FrontEnd', department: 'T2', created_at: '2025-09-10 09:30', active: false },
    { key: '9', name: 'Nguyễn Ngọc Quyết', email: '1234567@edulive.net', role: 'user', position: 'Công nhân', department: 'T3', created_at: '2025-09-10 09:30', active: false },
    { key: '10', name: 'Nguyên Văn A Nguyên Văn A Nguyên Văn A Nguyên Văn A Nguyên Văn A', email: '123456789@edulive.net', role: 'admin', position: 'Dev AI', department: 'T1', created_at: '2025-09-10 09:30', active: true },
    { key: '11', name: 'Trần Văn B', email: '1234567@edulive.net', role: 'manager', position: 'Dev FrontEnd', department: 'T2', created_at: '2025-09-10 09:30', active: false },
    { key: '12', name: 'Nguyễn Ngọc Quyết', email: '1234567@edulive.net', role: 'user', position: 'Công nhân', department: 'T3', created_at: '2025-09-10 09:30', active: false },
    { key: '13', name: 'Nguyên Văn A Nguyên Văn A Nguyên Văn A Nguyên Văn A Nguyên Văn A', email: '123456789@edulive.net', role: 'admin', position: 'Dev AI', department: 'T1', created_at: '2025-09-10 09:30', active: true },
    { key: '14', name: 'Trần Văn B', email: '1234567@edulive.net', role: 'manager', position: 'Dev FrontEnd', department: 'T2', created_at: '2025-09-10 09:30', active: false },
    { key: '15', name: 'Nguyễn Ngọc Quyết', email: '1234567@edulive.net', role: 'user', position: 'Công nhân', department: 'T3', created_at: '2025-09-10 09:30', active: false },
    { key: '16', name: 'Nguyên Văn A Nguyên Văn A Nguyên Văn A Nguyên Văn A Nguyên Văn A', email: '123456789@edulive.net', role: 'admin', position: 'Dev AI', department: 'T1', created_at: '2025-09-10 09:30', active: true },
    { key: '17', name: 'Trần Văn B', email: '1234567@edulive.net', role: 'manager', position: 'Dev FrontEnd', department: 'T2', created_at: '2025-09-10 09:30', active: false },
    { key: '18', name: 'Nguyễn Ngọc Quyết', email: '1234567@edulive.net', role: 'user', position: 'Công nhân', department: 'T3', created_at: '2025-09-10 09:30', active: false },
];

export default function UsersPage() {
    const { styles } = useStyle();

    const onView = (record: DataType) => message.info(`Xem chi tiết: ${record.name}`);
    const onEdit = (record: DataType) => message.success(`Sửa: ${record.name}`);
    const onDelete = (record: DataType) => message.success(`Đã xoá: ${record.name}`);

    const columns: TableColumnsType<DataType> = [
        // FIXED LEFT: Tên
        {
            title: 'Tên',
            dataIndex: 'name',
            key: 'name',
            width: 230,                 // cố định nhỏ gọn
            ellipsis: true,             // tên dài sẽ "..."
            onCell: () => ({            // khoá không cho nở quá width
                style: { maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
            }),
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
            width: 200,
            render: (text) => <Text ellipsis={{ tooltip: text }}>{text}</Text>,
        },
        {
            title: 'Vai trò',
            dataIndex: 'role',
            key: 'role',
            width: 100,
            align: 'center',
            filters: [
                { text: 'Admin', value: 'admin' },
                { text: 'Manager', value: 'manager' },
                { text: 'User', value: 'user' },
            ],
            onFilter: (value, record) => record.role === value,
            render: (role: DataType['role']) => {
                const color =
                    role === 'admin'
                        ? 'red'
                        : role === 'manager'
                            ? 'orange'
                            : 'blue';

                return (
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <Tag color={color} style={{ margin: 0 }}>
                            {String(role).toUpperCase()}
                        </Tag>
                    </div>
                );
            },
        },
        {
            title: 'Trạng thái',
            dataIndex: 'active',
            key: 'active',
            width: 110,
            align: 'center',
            filters: [
                { text: 'Active', value: true },
                { text: 'Inactive', value: false },
            ],
            onFilter: (value, record) => record.active === value,
            render: (active: boolean) => (
                <Tag color={active ? 'green' : 'volcano'}>
                    {active ? 'Active' : 'Inactive'}
                </Tag>
            ),
        },
        {
            title: 'Chức vụ',
            dataIndex: 'position',
            key: 'position',
            width: 160,
            render: (text) => <Text ellipsis={{ tooltip: text }}>{text}</Text>,
        },
        {
            title: 'Phòng ban',
            dataIndex: 'department',
            key: 'department',
            width: 110,
            onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
            ellipsis: true,
        },
        {
            title: 'Tạo lúc',
            dataIndex: 'created_at',
            key: 'created_at',
            width: 160,
            ellipsis: true
        },
        {
            title: 'Hành động',
            key: 'action',
            width: 200,
            render: (_, record) => (
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '100%',
                    height: '100%',
                    gap: 8  // Thay đổi giá trị này để điều chỉnh khoảng cách
                }}>
                    <Tag
                        color="blue"
                        style={{
                            cursor: 'pointer',
                            margin: 0  // Loại bỏ margin mặc định
                        }}
                        onClick={() => onView(record)}
                    >
                        Xem chi tiết
                    </Tag>

                    <Tag
                        color="gold"
                        style={{
                            cursor: 'pointer',
                            margin: 0  // Loại bỏ margin mặc định
                        }}
                        onClick={() => onEdit(record)}
                    >
                        Sửa
                    </Tag>

                    <Popconfirm
                        title="Xoá người dùng"
                        description={`Bạn chắc muốn xoá ${record.name}?`}
                        okText="Xoá"
                        cancelText="Huỷ"
                        onConfirm={() => onDelete(record)}
                    >
                        <Tag
                            color="red"
                            style={{
                                cursor: 'pointer',
                                margin: 0  // Loại bỏ margin mặc định
                            }}
                        >
                            Xoá
                        </Tag>
                    </Popconfirm>
                </div>
            ),
        }
    ];

    return (
        <Table<DataType>
            className={styles.customTable}
            columns={columns}
            dataSource={dataSource}
            bordered
            tableLayout="fixed"
            scroll={{ x: 1200 }}
            pagination={false}
            title={() => (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {/* Tiêu đề in đậm */}
                    <Title level={5} style={{ margin: 0 }}>
                        Danh sách nhân viên
                    </Title>

                    {/* Các nút chức năng */}
                    <Space>
                        <Button type="primary" onClick={() => message.info('Thêm nhân viên')}>
                            Thêm nhân viên
                        </Button>
                    </Space>
                </div>
            )}
            footer={() => ''}
        />
    );
}