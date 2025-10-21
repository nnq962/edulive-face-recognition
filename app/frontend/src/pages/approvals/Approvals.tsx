import React from 'react'
import { Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'

interface ReportData {
    key: string
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
    // Mock data
    const data: ReportData[] = [
        {
            key: '1',
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

    const columns: ColumnsType<ReportData> = [
        {
            title: 'Ngày',
            dataIndex: 'date',
            key: 'date',
            width: 115,
            fixed: 'left',
            sorter: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        },
        {
            title: 'Loại báo cáo',
            dataIndex: 'reportType',
            key: 'reportType',
            width: 110,
            render: (reportType: string) => (
                <Tag color={getReportTypeColor(reportType)}>{reportType}</Tag>
            ),
        },
        {
            title: 'Chi tiết',
            dataIndex: 'subType',
            key: 'subType',
            width: 130,
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
            width: 150,
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
        <div style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.03), 0 1px 6px -1px rgba(0,0,0,0.02), 0 2px 4px rgba(0,0,0,0.02)', borderRadius: 8, overflow: 'hidden', marginBottom: 0, marginTop: 8 }}>
            <Table
                columns={columns}
                dataSource={data}
                pagination={false}
                scroll={{ x: 1200 }}
                bordered
                title={() => (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontWeight: 600, fontSize: 16 }}>Danh sách các báo cáo</div>
                    </div>
                )}
                footer={() => (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: 14 }}>Tổng số báo cáo: {data.length}</div>
                    </div>
                )}
            />
        </div>
    )
}

export default Approvals
