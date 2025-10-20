import React, { useMemo, useState } from 'react'
import { Table, Tag, DatePicker, Button, Space } from 'antd'
import type { TableProps } from 'antd'
import type { FilterDropdownProps } from 'antd/es/table/interface'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

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
    date: string
    checkIn: string
    checkOut: string
    lastRecord: string
    note: TagType[]
}

const noteFilters = TAGS.map((tag) => ({
    text: <Tag color={tagColors[tag] || 'default'}>{tag}</Tag>,
    value: tag,
}))

const attendanceDetailsByDate: Record<string, Omit<AttendanceRecord, 'key' | 'date'>> = {
    '2025-10-16': {
        checkIn: '08:12',
        checkOut: '17:35',
        lastRecord: '17:35',
        note: ['Đúng giờ'] as TagType[],
    },
    '2025-10-15': {
        checkIn: '07:58',
        checkOut: '17:02',
        lastRecord: '17:02',
        note: ['Về sớm'] as TagType[],
    },
    '2025-10-14': {
        checkIn: '-',
        checkOut: '-',
        lastRecord: '-',
        note: ['Đi muộn', 'Về sớm', 'Nghỉ sáng', 'Có phép'] as TagType[],
    },
    '2025-10-13': {
        checkIn: '-',
        checkOut: '-',
        lastRecord: '-',
        note: ['Nghỉ cả ngày'] as TagType[],
    },
    '2025-10-12': {
        checkIn: '-',
        checkOut: '-',
        lastRecord: '-',
        note: ['Nghỉ sáng'] as TagType[],
    },
    '2025-10-11': {
        checkIn: '-',
        checkOut: '-',
        lastRecord: '-',
        note: ['Nghỉ chiều'] as TagType[],
    },
    '2025-10-10': {
        checkIn: '-',
        checkOut: '-',
        lastRecord: '-',
        note: ['Có phép'] as TagType[],
    },
    '2025-10-09': {
        checkIn: '-',
        checkOut: '-',
        lastRecord: '-',
        note: ['Đúng giờ'] as TagType[],
    },
}

const buildAttendanceData = (month: Dayjs): AttendanceRecord[] => {
    const start = month.startOf('month')
    const end = month.endOf('month')
    const rows: AttendanceRecord[] = []

    let current = start
    while (current.isBefore(end) || current.isSame(end)) {
        const formattedDate = current.format('YYYY-MM-DD')
        const base = attendanceDetailsByDate[formattedDate]
        const note: TagType[] = base?.note ? [...base.note] : []

        rows.push({
            key: formattedDate,
            date: formattedDate,
            checkIn: base?.checkIn ?? '-',
            checkOut: base?.checkOut ?? '-',
            lastRecord: base?.lastRecord ?? '-',
            note,
        })

        current = current.add(1, 'day')
    }

    return rows
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
    },
    {
        title: 'Check out',
        dataIndex: 'checkOut',
        key: 'checkOut',
        width: 150,
    },
    {
        title: 'Ghi nhận cuối',
        dataIndex: 'lastRecord',
        key: 'lastRecord',
        width: 150,
    },
    {
        title: 'Ghi chú',
        dataIndex: 'note',
        key: 'note',
        filters: noteFilters,
        onFilter: (value, record) => record.note?.includes(value as TagType),
        filterMultiple: true,
        render: (notes: TagType[]) => (
            <>
                {notes?.length
                    ? notes.map((note) => (
                        <Tag color={tagColors[note] || 'default'} key={note}>
                            {note}
                        </Tag>
                    ))
                    : '-'}
            </>
        ),
    },
]

const AttendanceDetailTable: React.FC = () => {
    const defaultMonth = useMemo(() => dayjs().utcOffset(420).startOf('month'), [])
    const [selectedMonth, setSelectedMonth] = useState<Dayjs>(defaultMonth)

    const tableData = useMemo(
        () => buildAttendanceData(selectedMonth),
        [selectedMonth],
    )

    const handleMonthChange = (value: Dayjs | null) => {
        if (!value) {
            setSelectedMonth(defaultMonth)
            return
        }

        setSelectedMonth(value.utcOffset(420, true).startOf('month'))
    }

    return (
        <div style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.03), 0 1px 6px -1px rgba(0,0,0,0.02), 0 2px 4px rgba(0,0,0,0.02)', borderRadius: 8, overflow: 'hidden' }}>
            <Table<AttendanceRecord>
                columns={columns}
                dataSource={tableData}
                pagination={false}
                bordered
                scroll={{ x: 'max-content' }}
                sticky
                onRow={(record) => {
                    const weekend = isWeekend(record.date)
                    return {
                        style: weekend ? { backgroundColor: '#fff1f0' } : undefined,
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
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div style={{
                            fontWeight: 600,
                            fontSize: 16,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            marginRight: '8px'
                        }}>
                            Dữ liệu chấm công
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                            <DatePicker
                                picker="month"
                                value={selectedMonth}
                                onChange={handleMonthChange}
                                format="YYYY-MM"
                                allowClear={false}
                                style={{ width: 102 }}
                            />
                            <Button type="primary" onClick={() => console.log('Export clicked')}>
                                Xuất dữ liệu
                            </Button>
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
                            <div style={{
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
                            </div>
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
        </div>
    )
}

export default AttendanceDetailTable
