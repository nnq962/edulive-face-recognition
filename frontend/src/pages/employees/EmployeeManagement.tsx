import React, { useState, useRef, useMemo } from 'react'
import { Table, Tag, Button, Input, Space, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { FilterDropdownProps } from 'antd/es/table/interface'
import { SearchOutlined, PlusOutlined, LoadingOutlined } from '@ant-design/icons'
import type { InputRef } from 'antd'
import Highlighter from 'react-highlight-words'
import EmployeeManagementDetailModal from './EmployeeManagementDetailModal'
import EmployeeManagementAddUserModal from './EmployeeManagementAddUserModal'
import { employeesApi } from '@/api'
import { useDepartments } from '@/contexts/DepartmentsContext';

interface EmployeeData {
    key: string
    employeeName: string
    email: string
    role: 'User' | 'Admin' | 'Super Admin'
    position: string
    department: string
    telegram: string
    status: 'active' | 'inactive'
}

const EmployeeManagement: React.FC = () => {
    const [searchText, setSearchText] = useState('')
    const [searchedColumn, setSearchedColumn] = useState('')
    const searchInput = useRef<InputRef>(null)
    const [modalOpen, setModalOpen] = useState(false)
    const [addModalOpen, setAddModalOpen] = useState(false)
    const [selectedEmployee, setSelectedEmployee] = useState<EmployeeData | null>(null)
    const [employeeList, setEmployeeList] = useState<EmployeeData[]>([])
    const [loading, setLoading] = useState(false)
    const { departments } = useDepartments()

    // Pagination state
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 50, // Mặc định 50 items/page
        total: 0,
    })

    const handleSearch = (
        selectedKeys: string[],
        confirm: FilterDropdownProps['confirm'],
        dataIndex: string,
    ) => {
        confirm()
        setSearchText(selectedKeys[0])
        setSearchedColumn(dataIndex)
    }

    const handleReset = (clearFilters: () => void) => {
        clearFilters()
        setSearchText('')
    }

    const getColumnSearchProps = (dataIndex: keyof EmployeeData) => ({
        filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters, close }: FilterDropdownProps) => (
            <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
                <Input
                    ref={searchInput}
                    placeholder={`Tìm kiếm`}
                    value={selectedKeys[0]}
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
                        Xóa
                    </Button>
                    <Button
                        type="link"
                        size="small"
                        onClick={() => {
                            close()
                        }}
                    >
                        Đóng
                    </Button>
                </Space>
            </div>
        ),
        filterIcon: (filtered: boolean) => (
            <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />
        ),
        onFilter: (value: any, record: EmployeeData) =>
            (record[dataIndex] ?? '')
                .toString()
                .toLowerCase()
                .includes((value as string).toLowerCase()),
        filterDropdownProps: {
            onOpenChange: (visible: boolean) => {
                if (visible) {
                    setTimeout(() => searchInput.current?.select(), 100)
                }
            },
        },
        render: (text: any) =>
            searchedColumn === dataIndex ? (
                <Highlighter
                    highlightStyle={{ backgroundColor: '#ffc069', padding: 0 }}
                    searchWords={[searchText]}
                    autoEscape
                    textToHighlight={text ? text.toString() : ''}
                />
            ) : (
                text
            ),
    })

    const handleRowClick = (record: EmployeeData) => {
        setSelectedEmployee(record)
        setModalOpen(true)
    }

    const handleCloseModal = () => {
        setModalOpen(false)
        setSelectedEmployee(null)
    }

    const handleUpdateEmployee = (updatedData: EmployeeData) => {
        setEmployeeList(prevList =>
            prevList.map(emp => emp.key === updatedData.key ? updatedData : emp)
        )
    }

    const handleDeleteEmployee = (key: string) => {
        // Xóa khỏi state local (modal đã gọi API rồi)
        setEmployeeList(prevList => prevList.filter(emp => emp.key !== key))

        // Reload lại từ server để đồng bộ với database
        // Nếu tổng số items giảm xuống và trang hiện tại rỗng, quay về trang trước
        const remainingItems = pagination.total - 1
        const maxPage = Math.ceil(remainingItems / pagination.pageSize)
        const targetPage = pagination.current > maxPage ? maxPage : pagination.current

        // Reload data
        fetchUsers(targetPage || 1, pagination.pageSize)
    }

    const handleAddEmployee = (newEmployee: Omit<EmployeeData, 'key'>) => {
        const newKey = (employeeList.length + 1).toString()
        const employeeWithKey: EmployeeData = {
            ...newEmployee,
            key: newKey,
        }
        setEmployeeList(prevList => [employeeWithKey, ...prevList])
    }

    // Fetch users từ API với pagination
    const fetchUsers = async (page: number = 1, pageSize: number = 50) => {
        try {
            setLoading(true)
            const response = await employeesApi.getAllUsers({
                page,
                limit: pageSize,
                sort: 'created_at',
                order: 'desc',
            })

            console.log('API Response:', response.data)

            // Backend trả về: { success: true, data: [...users], meta: {...pagination} }
            const users = response.data.data
            const meta = response.data.meta

            // Map data từ backend sang format của frontend
            const formattedUsers: EmployeeData[] = users.map((user: any) => ({
                key: user.id,
                employeeName: user.full_name || user.username,
                email: user.email,
                role: user.role,
                position: user.position || '-',
                department: user.department || '-',
                telegram: user.telegram_username || '-',
                status: user.is_active ? 'active' : 'inactive',
            }))

            setEmployeeList(formattedUsers)
            message.success(`Successfully loaded ${users.length} users`)

            // Cập nhật pagination state
            setPagination({
                current: meta.current_page,
                pageSize: meta.per_page,
                total: meta.total,
            })
        } catch (error: any) {
            console.error('Error fetching employee list:', error)
            message.error(error.response?.data?.message || 'Failed to load employee list')
        } finally {
            setLoading(false)
        }
    }

    // Initialize - Lấy trang 1 với 50 items
    React.useEffect(() => {
        fetchUsers(1, 50)
    }, [])

    // Handle khi user thay đổi trang hoặc pageSize
    const handleTableChange = (newPagination: any) => {
        fetchUsers(newPagination.current, newPagination.pageSize)
    }

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'super_admin':
                return 'red'
            case 'admin':
                return 'orange'
            case 'user':
                return 'blue'
            default:
                return 'default'
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'green'
            case 'inactive':
                return 'red'
            default:
                return 'default'
        }
    }

    const getStatusText = (status: string) => {
        switch (status) {
            case 'active':
                return 'Hoạt động'
            case 'inactive':
                return 'Đã nghỉ'
            default:
                return status
        }
    }

    // Lấy danh sách position unique từ employeeList
    const positionFilters = useMemo(() => {
        const positions = employeeList
            .map(emp => emp.position)
            .filter((pos): pos is string => pos !== '-' && pos !== null && pos !== undefined)
        const uniquePositions = Array.from(new Set(positions)).sort()
        return uniquePositions.map(pos => ({
            text: pos,
            value: pos,
        }))
    }, [employeeList])

    const columns: ColumnsType<EmployeeData> = [
        {
            title: 'Tên nhân viên',
            dataIndex: 'employeeName',
            key: 'employeeName',
            width: 180,
            fixed: 'left',
            ...getColumnSearchProps('employeeName'),
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
            width: 220,
            ...getColumnSearchProps('email'),
        },
        {
            title: 'Vai trò',
            dataIndex: 'role',
            key: 'role',
            width: 130,
            render: (role: string) => (
                <Tag color={getRoleColor(role)}>
                    {role === 'super_admin'
                        ? 'Super Admin'
                        : role === 'admin'
                            ? 'Admin'
                            : 'User'}
                </Tag>
            ),
            filters: [
                { text: 'Super Admin', value: 'super_admin' },
                { text: 'Admin', value: 'admin' },
                { text: 'User', value: 'user' },
            ],
            onFilter: (value, record) => record.role === value,
        },
        {
            title: 'Chức vụ',
            dataIndex: 'position',
            key: 'position',
            width: 150,
            filters: positionFilters,
            onFilter: (value, record) => record.position === value,
        },
        {
            title: 'Phòng ban',
            dataIndex: 'department',
            key: 'department',
            width: 120,
            filters: departments.map(dept => ({
                text: dept.name,
                value: dept.name,
            })),
            onFilter: (value, record) => record.department === value,
        },
        {
            title: 'Telegram',
            dataIndex: 'telegram',
            key: 'telegram',
            width: 140,
            render: (telegram: string) => (
                telegram !== '-' ? (
                    <a href={`https://t.me/${telegram.replace('@', '')}`} target="_blank" rel="noopener noreferrer">
                        {telegram}
                    </a>
                ) : (
                    <span style={{ color: '#999' }}>-</span>
                )
            ),
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            render: (status: string) => (
                <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
            ),
            filters: [
                { text: 'Hoạt động', value: 'active' },
                { text: 'Đã nghỉ', value: 'inactive' },
            ],
            onFilter: (value, record) => record.status === value,
        },
    ]

    return (
        <div style={{
            boxShadow: '0 2px 16px rgba(0,0,0,0.12)',
            borderRadius: 8,
            overflow: 'hidden'
        }}>
            <Table
                columns={columns}
                dataSource={employeeList}
                loading={{
                    spinning: loading,
                    indicator: <LoadingOutlined spin />,
                    tip: 'Loading all employee data...',
                }}
                onRow={(record) => ({
                    onClick: () => handleRowClick(record),
                    style: { cursor: 'pointer' },
                })}
                pagination={{
                    ...pagination,
                    showSizeChanger: true,
                    showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} bản ghi`,
                    pageSizeOptions: ['10', '20', '50', '100'],
                    style: {
                        paddingRight: '8px',
                    },
                }}
                onChange={handleTableChange}
                scroll={{ x: 1200 }}
                bordered
                title={() => (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 8
                    }}>
                        <div style={{
                            fontWeight: 600,
                            fontSize: 16,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            marginRight: '8px'
                        }}>
                            Quản lý nhân viên
                        </div>
                        <div style={{
                            display: 'flex',
                            gap: 8,
                            flexWrap: 'wrap'
                        }}>
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={() => setAddModalOpen(true)}
                            >
                                Thêm nhân viên
                            </Button>
                        </div>
                    </div>
                )}
            />
            <EmployeeManagementDetailModal
                open={modalOpen}
                onClose={handleCloseModal}
                employeeData={selectedEmployee}
                onUpdate={handleUpdateEmployee}
                onDelete={handleDeleteEmployee}
                onAddSuccess={() => fetchUsers(pagination.current, pagination.pageSize)}
            />
            <EmployeeManagementAddUserModal
                open={addModalOpen}
                onClose={() => setAddModalOpen(false)}
                onAddSuccess={() => fetchUsers(pagination.current, pagination.pageSize)}
            />
        </div>
    )
}

export default EmployeeManagement
