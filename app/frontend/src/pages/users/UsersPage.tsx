// src/pages/users/UsersPage.tsx
import React from 'react';
import {
    Table,
    Tag,
    message,
    Typography,
    Space,
    Button,
    Input,
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { createStyles } from 'antd-style';
import Highlighter from 'react-highlight-words';

import type {
    TableColumnsType,
    TableColumnType,
    InputRef,
} from 'antd';
import type { FilterDropdownProps } from 'antd/es/table/interface';
import UserDetailModal from './UserDetailModal';

const { Text, Title } = Typography;

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
    user_id: string;
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
    { key: '1', user_id: 'edu999', name: 'Nguyên Văn A', email: '123456789@edulive.net', role: 'admin', position: 'Dev AI', department: 'T1', created_at: '2025-09-10 09:30', active: true },
    { key: '2', user_id: 'edu999', name: 'Trần Văn B', email: '1234567@edulive.net', role: 'manager', position: 'Dev FrontEnd', department: 'T2', created_at: '2025-09-10 09:30', active: false },
    { key: '3', user_id: 'edu999', name: 'Nguyễn Ngọc Quyết', email: '1234567@edulive.net', role: 'user', position: 'Công nhân', department: 'Ban công', created_at: '2025-09-10 09:30', active: false },
    { key: '4', user_id: 'edu999', name: 'Nguyên Văn A', email: '123456789@edulive.net', role: 'admin', position: 'Dev AI', department: 'T1', created_at: '2025-09-10 09:30', active: true },
    { key: '5', user_id: 'edu999', name: 'Trần Văn B', email: '1234567@edulive.net', role: 'manager', position: 'Dev FrontEnd', department: 'T2', created_at: '2025-09-10 09:30', active: false },
    { key: '6', user_id: 'edu999', name: 'Nguyễn Ngọc Quyết', email: '1234567@edulive.net', role: 'user', position: 'Công nhân', department: 'T3', created_at: '2025-09-10 09:30', active: false },
    { key: '7', user_id: 'edu999', name: 'Nguyên Văn A', email: '123456789@edulive.net', role: 'admin', position: 'Dev AI', department: 'T1', created_at: '2025-09-10 09:30', active: true },
    { key: '8', user_id: 'edu999', name: 'Trần Văn B', email: '1234567@edulive.net', role: 'manager', position: 'Dev FrontEnd', department: 'T2', created_at: '2025-09-10 09:30', active: false },
    { key: '9', user_id: 'edu999', name: 'Nguyễn Ngọc Quyết', email: '1234567@edulive.net', role: 'user', position: 'Công nhân', department: 'T3', created_at: '2025-09-10 09:30', active: false },
    { key: '10', user_id: 'edu999', name: 'Nguyên Văn A', email: '123456789@edulive.net', role: 'admin', position: 'Dev AI', department: 'T1', created_at: '2025-09-10 09:30', active: true },
    { key: '11', user_id: 'edu999', name: 'Trần Văn B', email: '1234567@edulive.net', role: 'manager', position: 'Dev FrontEnd', department: 'T2', created_at: '2025-09-10 09:30', active: false },
    { key: '12', user_id: 'edu999', name: 'Nguyễn Ngọc Quyết', email: '1234567@edulive.net', role: 'user', position: 'Công nhân', department: 'T3', created_at: '2025-09-10 09:30', active: false },
    { key: '13', user_id: 'edu999', name: 'Nguyên Văn A', email: '123456789@edulive.net', role: 'admin', position: 'Dev AI', department: 'T1', created_at: '2025-09-10 09:30', active: true },
    { key: '14', user_id: 'edu999', name: 'Trần Văn B', email: '1234567@edulive.net', role: 'manager', position: 'Dev FrontEnd', department: 'T2', created_at: '2025-09-10 09:30', active: false },
    { key: '15', user_id: 'edu999', name: 'Nguyễn Ngọc Quyết', email: '1234567@edulive.net', role: 'user', position: 'Công nhân', department: 'T3', created_at: '2025-09-10 09:30', active: false },
    { key: '16', user_id: 'edu999', name: 'Nguyên Văn A', email: '123456789@edulive.net', role: 'admin', position: 'Dev AI', department: 'T1', created_at: '2025-09-10 09:30', active: true },
    { key: '17', user_id: 'edu999', name: 'Trần Văn B', email: '1234567@edulive.net', role: 'manager', position: 'Dev FrontEnd', department: 'T2', created_at: '2025-09-10 09:30', active: false },
    { key: '18', user_id: 'edu999', name: 'Nguyễn Ngọc Quyết', email: '1234567@edulive.net', role: 'user', position: 'Công nhân', department: 'T3', created_at: '2025-09-10 09:30', active: false },
];

export default function UsersPage() {
    const { styles } = useStyle();

    const [open, setOpen] = React.useState(false);
    const [selected, setSelected] = React.useState<DataType | null>(null);

    const openUserModal = (record: DataType) => {
        setSelected(record);
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setSelected(null);
    };

    // state + ref
    const [searchText, setSearchText] = React.useState('');
    const [searchedColumn, setSearchedColumn] = React.useState<keyof DataType | ''>('');
    const searchInput = React.useRef<InputRef>(null);

    const handleSearch = (
        selectedKeys: string[],
        confirm: FilterDropdownProps['confirm'],
        dataIndex: keyof DataType,
    ) => {
        confirm(); // áp dụng filter và ĐÓNG dropdown
        setSearchText(selectedKeys[0]);
        setSearchedColumn(dataIndex);
    };

    const handleReset = (clearFilters?: () => void) => {
        clearFilters?.();
        setSearchText('');
        setSearchedColumn('');
    };

    const getColumnSearchProps = (dataIndex: keyof DataType): TableColumnType<DataType> => ({
        filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
            <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
                <Input
                    ref={searchInput}
                    placeholder={`Tìm ${dataIndex === 'name' ? 'tên' : String(dataIndex)}`}
                    value={selectedKeys[0] as string}
                    onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
                    onPressEnter={() => handleSearch(selectedKeys as string[], confirm, dataIndex)}
                    style={{ marginBottom: 8, display: 'block' }}
                />
                <Space>
                    <Button
                        type="primary"
                        onClick={() => handleSearch(selectedKeys as string[], confirm, dataIndex)}
                        icon={<SearchOutlined />}
                        size="small"
                        style={{ width: 90 }}
                    >
                        Tìm
                    </Button>
                    <Button
                        onClick={() => clearFilters && handleReset(clearFilters)}
                        size="small"
                        style={{ width: 90 }}
                    >
                        Reset
                    </Button>
                </Space>
            </div>
        ),
        filterIcon: (filtered) => (
            <SearchOutlined style={{ color: filtered ? '#1677ff' : undefined }} />
        ),
        onFilter: (value, record) =>
            String(record[dataIndex] ?? '')
                .toLowerCase()
                .includes(String(value).toLowerCase()),
        filterDropdownProps: {
            onOpenChange(open) {
                if (open) setTimeout(() => searchInput.current?.select(), 100);
            },
        },
        render: (text: any) =>
            searchedColumn === dataIndex ? (
                <Highlighter
                    highlightStyle={{ backgroundColor: '#ffc069', padding: 0 }}
                    searchWords={[searchText]}
                    autoEscape
                    textToHighlight={text ? String(text) : ''}
                />
            ) : (
                text
            ),
    });

    const columns: TableColumnsType<DataType> = [
        {
            title: 'Mã NV',
            dataIndex: 'user_id',
            key: 'user_id',
            width: 85,
            onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
            ellipsis: true,
        },
        {
            title: 'Tên',
            dataIndex: 'name',
            key: 'name',
            width: 230,                 // cố định nhỏ gọn
            ellipsis: true,             // tên dài sẽ "..."
            onCell: () => ({            // khoá không cho nở quá width
                style: { maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
            }),
            ...getColumnSearchProps('name'),
            render: (text: any, record: DataType) => (
                searchedColumn === 'name' ? (
                    <a onClick={() => openUserModal(record)}>
                        <Highlighter
                            highlightStyle={{ backgroundColor: '#ffc069', padding: 0 }}
                            searchWords={[searchText]}
                            autoEscape
                            textToHighlight={text ? String(text) : ''}
                        />
                    </a>
                ) : (
                    <a onClick={() => openUserModal(record)}>
                        {text}
                    </a>
                )
            ),
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
            width: 200,
            render: (text) => <Text ellipsis={{ tooltip: text }}>{text}</Text>,
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
    ];

    return (
        <>
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
                        <Title level={5} style={{ margin: 0 }}>
                            Danh sách nhân viên
                        </Title>
                        <Space>
                            <Button type="primary" onClick={() => message.info('Thêm nhân viên')}>
                                Thêm nhân viên
                            </Button>
                        </Space>
                    </div>
                )}
                footer={() => ''}
            />

            <UserDetailModal
                user={selected}
                open={open}
                onClose={handleClose}
                onSave={(user) => {
                    console.log('Lưu user:', user);
                    // Xử lý logic lưu
                }}
                onDelete={(userId) => {
                    console.log('Xóa user:', userId);
                    // Xử lý logic xóa
                }}
            />
        </>
    );
}