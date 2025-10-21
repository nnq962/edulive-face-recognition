import React, { useState, useRef } from 'react'
import { Table, Tag, DatePicker, Input, Button, Space } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { FilterDropdownProps } from 'antd/es/table/interface'
import { SearchOutlined } from '@ant-design/icons'
import type { InputRef } from 'antd'
import Highlighter from 'react-highlight-words'
import ApprovalsModal from './ApprovalsModal'

const { RangePicker } = DatePicker;



interface ReportData {
    key: string
    employeeName: string
    date: string
    reportType: string
    subType?: string
    description: string
    createdAt: string
    status: 'pending' | 'approved' | 'rejected'
    approvedBy?: string
    feedback?: string
}

const Approvals: React.FC = () => {
    const [searchText, setSearchText] = useState('')
    const [searchedColumn, setSearchedColumn] = useState('')
    const searchInput = useRef<InputRef>(null)
    const [modalOpen, setModalOpen] = useState(false)
    const [selectedReport, setSelectedReport] = useState<ReportData | null>(null)

    const [loadings, setLoadings] = useState<boolean[]>([]);

    const enterLoading = (index: number) => {
        console.log('Start loading:', index);

        setLoadings((prevLoadings) => {
            const newLoadings = [...prevLoadings];
            newLoadings[index] = true;
            return newLoadings;
        });

        setTimeout(() => {
            setLoadings((prevLoadings) => {
                const newLoadings = [...prevLoadings];
                newLoadings[index] = false;
                return newLoadings;
            });
        }, 3000);
    };

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

    const getColumnSearchProps = (dataIndex: keyof ReportData) => ({
        filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters, close }: FilterDropdownProps) => (
            <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
                <Input
                    ref={searchInput}
                    placeholder={`Tìm kiếm tên`}
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
        onFilter: (value: any, record: ReportData) =>
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

    // Mock data
    const data: ReportData[] = [
        {
            key: '1',
            employeeName: 'Nguyễn Văn A',
            date: '2025-10-19',
            reportType: 'Xin phép',
            subType: 'Đi muộn',
            description: 'Xin phép đi muộn do kẹt xe trên đường Võ Văn Ngân',
            createdAt: '2025-10-19 08:45',
            status: 'pending',
            approvedBy: undefined,
            feedback: undefined,
        },
        {
            key: '2',
            employeeName: 'Trần Thị B',
            date: '2025-10-19',
            reportType: 'Máy lỗi',
            subType: 'Không nhận diện',
            description: 'Máy chấm công không nhận diện được khuôn mặt nhiều lần',
            createdAt: '2025-10-19 08:30',
            status: 'approved',
            approvedBy: 'Nguyễn Văn A',
            feedback: 'Đã kiểm tra và xác nhận sự cố',
        },
        {
            key: '3',
            employeeName: 'Lê Văn C',
            date: '2025-10-18',
            reportType: 'Feedback',
            subType: undefined,
            description: 'Đề xuất thêm máy chấm công ở cổng phía sau',
            createdAt: '2025-10-18 17:00',
            status: 'pending',
            approvedBy: undefined,
            feedback: undefined,
        },
        {
            key: '4',
            employeeName: 'Phạm Thị D',
            date: '2025-10-18',
            reportType: 'Xin phép',
            subType: 'Nghỉ sáng',
            description: 'Xin nghỉ buổi sáng để đi khám bệnh',
            createdAt: '2025-10-18 07:30',
            status: 'approved',
            approvedBy: 'Trần Thị B',
            feedback: 'Đồng ý cho phép',
        },
        {
            key: '5',
            employeeName: 'Hoàng Văn E',
            date: '2025-10-17',
            reportType: 'Máy lỗi',
            subType: 'Không hoạt động',
            description: 'Máy chấm công tầng 3 bị tắt nguồn',
            createdAt: '2025-10-17 16:20',
            status: 'rejected',
            approvedBy: 'Lê Văn C',
            feedback: 'Không phải lỗi máy, do mất điện toàn tòa nhà',
        },
        {
            key: '6',
            employeeName: 'Võ Thị F',
            date: '2025-10-17',
            reportType: 'Xin phép',
            subType: 'Cả ngày',
            description: 'Xin nghỉ cả ngày để giải quyết việc gia đình',
            createdAt: '2025-10-17 08:00',
            status: 'approved',
            approvedBy: 'Phạm Thị D',
            feedback: 'Chấp thuận',
        },
    ]

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending':
                return 'gold'
            case 'approved':
                return 'green'
            case 'rejected':
                return 'red'
            default:
                return 'default'
        }
    }

    const getStatusText = (status: string) => {
        switch (status) {
            case 'pending':
                return 'Chờ duyệt'
            case 'approved':
                return 'Đã duyệt'
            case 'rejected':
                return 'Từ chối'
            default:
                return status
        }
    }

    const getReportTypeColor = (reportType: string) => {
        switch (reportType) {
            case 'Feedback':
                return 'blue'
            case 'Máy lỗi':
                return 'red'
            case 'Xin phép':
                return 'orange'
            default:
                return 'default'
        }
    }

    const handleRowClick = (record: ReportData) => {
        setSelectedReport(record)
        setModalOpen(true)
    }

    const handleCloseModal = () => {
        setModalOpen(false)
        setSelectedReport(null)
    }

    const columns: ColumnsType<ReportData> = [
        {
            title: 'Tên nhân viên',
            dataIndex: 'employeeName',
            key: 'employeeName',
            width: 150,
            fixed: 'left',
            ...getColumnSearchProps('employeeName'),
        },
        {
            title: 'Ngày',
            dataIndex: 'date',
            key: 'date',
            width: 115,
            sorter: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        },
        {
            title: 'Loại báo cáo',
            dataIndex: 'reportType',
            key: 'reportType',
            width: 120,
            render: (reportType: string) => (
                <Tag color={getReportTypeColor(reportType)}>{reportType}</Tag>
            ),
        },
        {
            title: 'Chi tiết',
            dataIndex: 'subType',
            key: 'subType',
            width: 145,
            render: (subType?: string) => (
                subType ? <Tag>{subType}</Tag> : <span style={{ color: '#999' }}></span>
            ),
        },
        {
            title: 'Mô tả',
            dataIndex: 'description',
            key: 'description',
            width: 250,
        },
        {
            title: 'Tạo lúc',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 155,
            sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
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
                { text: 'Chờ duyệt', value: 'pending' },
                { text: 'Đã duyệt', value: 'approved' },
                { text: 'Từ chối', value: 'rejected' },
            ],
            onFilter: (value, record) => record.status === value,
        },
        {
            title: 'Phê duyệt bởi',
            dataIndex: 'approvedBy',
            key: 'approvedBy',
            width: 150,
            render: (approvedBy?: string) => (
                approvedBy ? approvedBy : <span style={{ color: '#999' }}></span>
            ),
        },
        {
            title: 'Phản hồi',
            dataIndex: 'feedback',
            key: 'feedback',
            width: 200,
            render: (feedback?: string) => (
                feedback ? feedback : <span style={{ color: '#999' }}></span>
            ),
        },
    ]

    return (
        <>
            <div style={{
                boxShadow: '0 2px 16px rgba(0,0,0,0.12)',
                borderRadius: 8,
                overflow: 'hidden',
                marginBottom: 0
            }}>
                <Table
                    columns={columns}
                    dataSource={data}
                    pagination={{
                        pageSize: 10,
                        showSizeChanger: true, // Hiển thị dropdown chọn số item/page
                        showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} bản ghi`, // Hiển thị tổng số
                        pageSizeOptions: ['10', '20', '50', '100'], // Các option cho dropdown
                        style: {
                            paddingRight: '8px',
                        },
                    }}
                    scroll={{ x: 1200 }}
                    bordered
                    onRow={(record) => ({
                        onClick: () => handleRowClick(record),
                        style: { cursor: 'pointer' },
                    })}
                    title={() => (
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap', // 👈 Cho phép xuống dòng
                                gap: 8,           // 👈 Giữ khoảng cách ngang
                                rowGap: 8,        // 👈 Khoảng cách khi xuống hàng
                            }}
                        >
                            {/* Tiêu đề */}
                            <div
                                style={{
                                    fontWeight: 600,
                                    fontSize: 16,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0,
                                    marginRight: 8,
                                }}
                            >
                                Danh sách các báo cáo
                            </div>

                            {/* Bộ lọc ngày */}
                            <div
                                style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: 8,
                                    flexShrink: 0,
                                }}
                            >
                                <RangePicker
                                    style={{ width: 230 }}
                                    placeholder={['Từ ngày', 'Đến ngày']}
                                />
                                <Button type="primary" loading={loadings[0]} onClick={() => enterLoading(0)}>
                                    Làm mới
                                </Button>
                            </div>
                        </div>
                    )}
                    // footer={() => (
                    //     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    //         <div style={{ fontSize: 14 }}>Tổng số báo cáo: {data.length}</div>
                    //     </div>
                    // )}
                />
            </div>
            <ApprovalsModal
                open={modalOpen}
                onClose={handleCloseModal}
                reportData={selectedReport}
            />
        </>
    )
}

export default Approvals
