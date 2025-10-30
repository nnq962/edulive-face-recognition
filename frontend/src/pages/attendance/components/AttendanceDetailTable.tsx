import React, { useMemo, useState, useEffect } from 'react'
import { Table, Tag, DatePicker, Button, Space, message } from 'antd'
import type { TableProps } from 'antd'
import type { FilterDropdownProps } from 'antd/es/table/interface'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import AttendanceDetailModal from './AttendanceDetailModal'
import { attendancesApi } from '@/api';

dayjs.extend(utc)
dayjs.extend(timezone)

const TAGS = [
    'Đúng giờ',
    'Đi muộn',
    'Về sớm',
    'Nghỉ sáng',
    'Nghỉ chiều',
    'Nghỉ cả ngày',
    'Có phép',
] as const
type TagType = typeof TAGS[number]

const tagColors: Record<string, string> = {
    'Đúng giờ': 'green',
    'Đi muộn': 'volcano',
    'Về sớm': 'orange',
    'Nghỉ sáng': 'geekblue',
    'Nghỉ chiều': 'purple',
    'Nghỉ cả ngày': '',
    'Có phép': 'blue',
}

interface AttendanceRecord {
    key: string
    id: string               // ID từ API
    date: string             // Format: YYYY-MM-DD
    checkIn: string          // Format: HH:mm
    checkOut: string         // Format: HH:mm
    lastRecord: string       // Format: HH:mm
    note: TagType[]
}

// API Response types
interface AttendanceApiResponse {
    id: string
    full_name: string
    date: string                    // UTC: "2025-10-01T00:00:00Z"
    check_in_time: string           // UTC: "2025-10-01T08:12:00Z"
    check_out_time: string          // UTC: "2025-10-01T17:35:00Z"
    last_timestamp: {
        time: string                // UTC: "2025-10-29T10:43:22Z"
        camera_id: string
    }
}

const noteFilters = TAGS.map((tag) => ({
    text: <Tag color={tagColors[tag] || 'default'}>{tag}</Tag>,
    value: tag,
}))

// Helper: Convert UTC datetime sang giờ Việt Nam và format
const formatUTCToVietnamTime = (utcDateString: string, format: string): string => {
    if (!utcDateString || utcDateString === '-') return '-'
    return dayjs.utc(utcDateString).tz('Asia/Ho_Chi_Minh').format(format)
}

// Helper: Convert API response sang table record
const convertApiResponseToRecord = (apiData: AttendanceApiResponse): AttendanceRecord => {
    return {
        key: apiData.id,
        id: apiData.id,
        date: formatUTCToVietnamTime(apiData.date, 'YYYY-MM-DD'),
        checkIn: formatUTCToVietnamTime(apiData.check_in_time, 'HH:mm'),
        checkOut: formatUTCToVietnamTime(apiData.check_out_time, 'HH:mm'),
        lastRecord: formatUTCToVietnamTime(apiData.last_timestamp.time, 'HH:mm'),
        note: [], // Tạm thời để trống, logic sẽ thêm sau
    }
}

// Helper: Tạo tất cả các ngày trong date range (kể cả không có dữ liệu)
const generateDateRange = (startDate: Dayjs, endDate: Dayjs): AttendanceRecord[] => {
    const rows: AttendanceRecord[] = []
    let current = startDate.startOf('day')
    const end = endDate.startOf('day')
    
    while (current.isBefore(end) || current.isSame(end, 'day')) {
        const dateStr = current.format('YYYY-MM-DD')
        rows.push({
            key: dateStr,
            id: dateStr,
            date: dateStr,
            checkIn: '-',
            checkOut: '-',
            lastRecord: '-',
            note: [],
        })
        current = current.add(1, 'day')
    }
    
    return rows
}

// Helper: Merge data từ API vào full calendar
const mergeAttendanceData = (fullCalendar: AttendanceRecord[], apiData: AttendanceRecord[]): AttendanceRecord[] => {
    const dataMap = new Map(apiData.map(item => [item.date, item]))
    
    return fullCalendar.map(day => {
        const apiRecord = dataMap.get(day.date)
        return apiRecord || day
    })
}

const isWeekend = (date: string) => {
    const weekday = dayjs(date).day()
    return weekday === 0 || weekday === 6
}

const columns: TableProps<AttendanceRecord>['columns'] = [
    {
        title: 'Ngày',
        dataIndex: 'date',
        key: 'date',
        width: 115,
        fixed: 'left',
        onCell: (record) => {
            const weekend = isWeekend(record.date)
            return {
                style: weekend ? { backgroundColor: '#fff1f0' } : undefined,
            }
        },
        filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: FilterDropdownProps) => (
            <div style={{ padding: 8 }}>
                <DatePicker
                    value={selectedKeys[0] ? dayjs(selectedKeys[0] as string) : null}
                    onChange={(date) => {
                        setSelectedKeys(date ? [date.format('YYYY-MM-DD')] : [])
                    }}
                    format="YYYY-MM-DD"
                    style={{ width: '100%', marginBottom: 8, display: 'block' }}
                />
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Button
                        onClick={() => {
                            if (clearFilters) {
                                clearFilters()
                            }
                        }}
                        size="small"
                        type="link"
                    >
                        Reset
                    </Button>
                    <Button
                        type="primary"
                        onClick={() => confirm()}
                        size="small"
                    >
                        OK
                    </Button>
                </Space>
            </div>
        ),
        onFilter: (value, record) => record.date === value,
    },
    {
        title: 'Check in',
        dataIndex: 'checkIn',
        key: 'checkIn',
        width: 150,
        render: (text: string) => (
            text !== '-' ? text : <span style={{ color: '#999' }}>-</span>
        ),
    },
    {
        title: 'Check out',
        dataIndex: 'checkOut',
        key: 'checkOut',
        width: 150,
        render: (text: string) => (
            text !== '-' ? text : <span style={{ color: '#999' }}>-</span>
        ),
    },
    {
        title: 'Ghi nhận cuối',
        dataIndex: 'lastRecord',
        key: 'lastRecord',
        width: 150,
        render: (text: string) => (
            text !== '-' ? text : <span style={{ color: '#999' }}>-</span>
        ),
    },
    // {
    //     title: 'Ghi chú',
    //     dataIndex: 'note',
    //     key: 'note',
    //     filters: noteFilters,
    //     onFilter: (value, record) => record.note?.includes(value as TagType),
    //     filterMultiple: true,
    //     render: (notes: TagType[]) => (
    //         <>
    //             {notes?.length
    //                 ? notes.map((note) => (
    //                     <Tag color={tagColors[note] || 'default'} key={note}>
    //                         {note}
    //                     </Tag>
    //                 ))
    //                 : '-'}
    //         </>
    //     ),
    // },
]

const AttendanceDetailTable: React.FC = () => {
// Tính toán tháng hiện tại theo giờ Việt Nam (UTC+7)
const currentMonth = useMemo<Dayjs>(() => {
return dayjs().tz('Asia/Ho_Chi_Minh').startOf('month')
}, [])

const [modalOpen, setModalOpen] = useState(false)
const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null)
const [loading, setLoading] = useState(false)
const [tableData, setTableData] = useState<AttendanceRecord[]>([])
const [selectedMonth, setSelectedMonth] = useState<Dayjs>(currentMonth)

// Pagination states
const [currentPage, setCurrentPage] = useState(1)
const [pageSize, setPageSize] = useState(50)
const [total, setTotal] = useState(0)

    // Fetch data từ API cho một tháng
    const fetchAttendancesByMonth = async (month: Dayjs) => {
        try {
            setLoading(true)
            
            // Lấy ngày đầu và cuối tháng
            const startOfMonth = month.startOf('month').startOf('day')
            const endOfMonth = month.endOf('month').endOf('day')
            
            // Convert giờ VN sang UTC cho API
            const startUTC = startOfMonth.utc().format('YYYY-MM-DDTHH:mm:ss[Z]')
            const endUTC = endOfMonth.utc().format('YYYY-MM-DDTHH:mm:ss[Z]')
            
            const params = {
                start_date: startUTC,
                end_date: endUTC,
                page: 1,
                limit: 31, // Tối đa 31 ngày trong 1 tháng
                sort: 'date',
                order: 'asc' as const,
            }

            const response = await attendancesApi.getMyAttendances(params)
            
            if (response.data.success) {
                const apiData: AttendanceApiResponse[] = response.data.data
                const apiRecords = apiData.map(convertApiResponseToRecord)
                
                // Tạo full calendar của tháng đó
                const fullCalendar = generateDateRange(startOfMonth, endOfMonth)
                
                // Merge data từ API vào full calendar
                const mergedData = mergeAttendanceData(fullCalendar, apiRecords)
                
                setTableData(mergedData)
                setTotal(mergedData.length)
                // message.success(`Tải thành công ${apiRecords.length} bản ghi`)
                message.success(`Successfully loaded ${apiRecords.length} records`)
            } else {
                // message.error('Không thể tải dữ liệu chấm công')
                message.error('Failed to load attendance data')
                setTableData([])
                setTotal(0)
            }
        } catch (error) {
            // console.error('Lỗi khi tải dữ liệu chấm công:', error)
            // message.error('Lỗi khi tải dữ liệu chấm công. Vui lòng thử lại!')
            message.error('Failed to load attendance data. Please try again!')
            setTableData([])
            setTotal(0)
        } finally {
            setLoading(false)
        }
    }

    // Load data khi component mount
    useEffect(() => {
        fetchAttendancesByMonth(selectedMonth)
    }, [])

    // Handle refresh button
    const handleRefresh = () => {
        setCurrentPage(1)
        fetchAttendancesByMonth(selectedMonth)
    }

    // Handle month change
    const handleMonthChange = (month: Dayjs | null) => {
        if (month) {
            setSelectedMonth(month)
            setCurrentPage(1)
            fetchAttendancesByMonth(month)
        }
    }

    // Handle pagination change (chỉ cần update state, không fetch lại)
    const handleTableChange = (page: number, newPageSize: number) => {
        setCurrentPage(page)
        setPageSize(newPageSize)
    }

    const handleRowClick = (record: AttendanceRecord) => {
        setSelectedRecord(record)
        setModalOpen(true)
    }

    const handleCloseModal = () => {
        setModalOpen(false)
        setSelectedRecord(null)
    }

    return (
        <div style={{
            boxShadow: '0 2px 16px rgba(0,0,0,0.12)',
            overflow: 'hidden',
            borderRadius: 8,
        }}>
            <Table<AttendanceRecord>
                columns={columns}
                dataSource={tableData}
                loading={{
                    spinning: loading,
                    // tip: 'Đang tải dữ liệu chấm công...',
                    tip: 'Loading attendance data...',
                }}
                pagination={{
                    current: currentPage,
                    pageSize: pageSize,
                    total: total,
                    showSizeChanger: true,
                    showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} bản ghi`,
                    pageSizeOptions: ['10', '20', '50', '100'],
                    defaultPageSize: 50,
                    onChange: handleTableChange,
                    style: {
                        paddingRight: '8px',
                    },
                }}
                bordered
                scroll={{ x: 'max-content' }}
                sticky
                onRow={(record) => {
                    const weekend = isWeekend(record.date)
                    return {
                        style: weekend ? { backgroundColor: '#fff1f0', cursor: 'pointer' } : { cursor: 'pointer' },
                        onClick: () => handleRowClick(record),
                        onMouseEnter: (e) => {
                            if (weekend) {
                                const row = e.currentTarget
                                const cells = row.querySelectorAll('td')
                                cells.forEach((cell: Element) => {
                                    (cell as HTMLElement).style.backgroundColor = '#ffe4e1'
                                })
                            }
                        },
                        onMouseLeave: (e) => {
                            if (weekend) {
                                const row = e.currentTarget
                                const cells = row.querySelectorAll('td')
                                cells.forEach((cell: Element) => {
                                    (cell as HTMLElement).style.backgroundColor = '#fff1f0'
                                })
                            }
                        },
                    }
                }}
                title={() => (
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',       // 👈 Cho phép xuống dòng
                            gap: 8,                 // 👈 Giữ khoảng cách tối thiểu 8px
                            rowGap: 8,              // 👈 Khi xuống hàng, khoảng cách dọc là 8px
                        }}
                    >
                        <div
                            style={{
                                fontWeight: 600,
                                fontSize: 16,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                marginRight: '8px'    // 👈 Đổi thành string
                            }}
                        >
                            Dữ liệu chấm công
                        </div>

                        {/* Nhóm nút RangePicker + Export */}
                        <div
                            style={{
                                display: 'flex',
                                flexWrap: 'wrap',    // 👈 Cho phép 2 nút này tự xuống dòng nếu hẹp
                                gap: 8,
                                // 👈 BỎ minWidth và flexShrink: 0 đi để cho phép wrap
                            }}
                        >
                            <DatePicker
                                picker="month"
                                allowClear={false}
                                value={selectedMonth}
                                onChange={handleMonthChange}
                                format="YYYY-MM"
                                style={{ width: 105}}
                                placeholder="Chọn tháng"
                            />
                            <Button
                                type="primary"
                                loading={loading}
                                onClick={handleRefresh}
                            >
                                Làm mới
                            </Button>
                            {/* <Button
                                type="primary"
                                onClick={() => console.log('Export clicked')}
                            >
                                Xuất dữ liệu
                            </Button> */}
                        </div>
                    </div>
                )}
                footer={() => {
                    // Mock data summary
                    const summary = {
                        totalDays: 20,
                        onTime: 18,
                        late810: 1,
                        late830: 1,
                        earlyLeave: 1,
                        morningAbsent: 0,
                        afternoonAbsent: 0,
                        fullDayOff: 0,
                        fine: '100K',
                    }

                    return (
                        <div>
                            {/* <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, 1fr)',
                                gap: '8px 24px',
                                marginBottom: '12px',
                                paddingBottom: '12px',
                                borderBottom: '1px solid #f0f0f0'
                            }}>
                                <span style={{ fontSize: '14px' }}>
                                    <strong>Tổng ngày công:</strong> {summary.totalDays}
                                </span>
                                <span style={{ fontSize: '14px' }}>
                                    <strong>Đúng giờ:</strong> {summary.onTime}
                                </span>
                                <span style={{ fontSize: '14px' }}>
                                    <strong>Muộn sau 8:10:</strong> {summary.late810}
                                </span>
                                <span style={{ fontSize: '14px' }}>
                                    <strong>Muộn sau 8:30:</strong> {summary.late830}
                                </span>
                                <span style={{ fontSize: '14px' }}>
                                    <strong>Về sớm:</strong> {summary.earlyLeave}
                                </span>
                                <span style={{ fontSize: '14px' }}>
                                    <strong>Nghỉ sáng:</strong> {summary.morningAbsent}
                                </span>
                                <span style={{ fontSize: '14px' }}>
                                    <strong>Nghỉ chiều:</strong> {summary.afternoonAbsent}
                                </span>
                                <span style={{ fontSize: '14px' }}>
                                    <strong>Nghỉ cả ngày:</strong> {summary.fullDayOff}
                                </span>
                                <span style={{ fontSize: '14px' }}>
                                    <strong>Tiền phạt:</strong> {summary.fine}
                                </span>
                            </div> */}
                            <div style={{
                                color: 'red',
                                fontSize: '14px',
                                fontStyle: 'italic'
                            }}>
                                Những ngày được bôi đỏ là thứ 7 và chủ nhật.
                            </div>
                        </div>
                    )
                }}
            />
            <AttendanceDetailModal
                open={modalOpen}
                onClose={handleCloseModal}
                record={selectedRecord}
            />
        </div>
    )
}

export default AttendanceDetailTable
