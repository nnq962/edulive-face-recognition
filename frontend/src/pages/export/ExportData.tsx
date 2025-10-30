import React, { useState, useRef, useEffect } from 'react'
import { Table, Tag, Button, DatePicker, Input, Space, message, Card, Row, Col, Select } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { FilterDropdownProps } from 'antd/es/table/interface'
import { SearchOutlined, ClearOutlined } from '@ant-design/icons'
import type { InputRef } from 'antd'
import Highlighter from 'react-highlight-words'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import exportdataApi from '../../api/exportdataApi'
import { useDepartments } from '../../contexts/DepartmentsContext'

// Types cho API response
interface DailyAttendance {
  date: string
  check_in_time: string | null
  check_out_time: string | null
}

interface UserMonthlyAttendance {
  user_id: string
  full_name: string
  attendances: DailyAttendance[]
}

interface ApiResponse {
  success: boolean
  message: string
  data: UserMonthlyAttendance[]
  meta: {
    current_page: number
    per_page: number
    total: number
    total_pages: number
    from: number
    to: number
    has_next: boolean
    has_prev: boolean
  }
}

interface ExportDataRecord {
  key: string
  employeeName: string
  date: string
  dayOfWeek: string
  checkIn: string
  checkOut: string
  totalHours: string
  fine: string
  note: string[]
}

const isWeekend = (date: string) => {
  const weekday = dayjs(date).day()
  return weekday === 0 || weekday === 6
}

const ExportData: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState<Dayjs>(dayjs())
  const [searchText, setSearchText] = useState('')
  const [searchedColumn, setSearchedColumn] = useState('')
  const searchInput = useRef<InputRef>(null)

  // API states
  const [data, setData] = useState<ExportDataRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(100)
  const [total, setTotal] = useState(0)
  const [loadings, setLoadings] = useState<boolean[]>([])

  // Filter states - Các state để quản lý filters
  const [filterMonth, setFilterMonth] = useState<Dayjs | null>(dayjs()) // Tháng được chọn
  const [filterDate, setFilterDate] = useState<Dayjs | null>(null) // Ngày cụ thể
  const [filterName, setFilterName] = useState<string>('') // Tên nhân viên
  const [filterDepartment, setFilterDepartment] = useState<string | undefined>(undefined) // Phòng ban

  // Lấy danh sách phòng ban từ Context
  const { departments, loading: departmentsLoading } = useDepartments()

  // Function để fetch data từ API
  const fetchMonthlyReport = async (month: string, page: number, limit: number) => {
    try {
      setLoading(true)
      const response: ApiResponse = await exportdataApi.getMonthlyAttendanceReport({
        month,
        page,
        limit
      })

      // Transform data từ API sang format của Table
      const transformedData: ExportDataRecord[] = []

      message.success(response.message || `Đã tải ${response.data.length} bản ghi`)

      response.data.forEach((user) => {
        user.attendances.forEach((attendance) => {
          const date = dayjs(attendance.date)
          const dayOfWeek = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'][date.day()]

          transformedData.push({
            key: `${user.user_id}-${attendance.date}`,
            employeeName: user.full_name,
            date: attendance.date,
            dayOfWeek,
            checkIn: attendance.check_in_time
              ? dayjs(attendance.check_in_time).format('HH:mm')
              : '-',
            checkOut: attendance.check_out_time
              ? dayjs(attendance.check_out_time).format('HH:mm')
              : '-',
            totalHours: calculateTotalHours(attendance.check_in_time, attendance.check_out_time),
            fine: '0đ',
            note: []
          })
        })
      })

      setData(transformedData)
      setTotal(response.meta.total)
      setCurrentPage(response.meta.current_page)

    } catch (error: any) {
      console.error('Error fetching monthly report:', error)
      message.error(error?.response?.data?.detail || 'Không thể tải dữ liệu báo cáo')
    } finally {
      setLoading(false)
    }
  }

  // Helper function để tính tổng giờ làm việc
  const calculateTotalHours = (checkIn: string | null, checkOut: string | null): string => {
    if (!checkIn || !checkOut) return '0h 0m'

    const start = dayjs(checkIn)
    const end = dayjs(checkOut)
    const diffMinutes = end.diff(start, 'minute')

    const hours = Math.floor(diffMinutes / 60)
    const minutes = diffMinutes % 60

    return `${hours}h ${minutes}m`
  }

  // Fetch data khi component mount hoặc khi selectedMonth thay đổi
  useEffect(() => {
    const month = selectedMonth.format('YYYY-MM')
    fetchMonthlyReport(month, currentPage, pageSize)
  }, [selectedMonth])

  // Handle làm mới data
  const handleRefresh = () => {
    const month = selectedMonth.format('YYYY-MM')
    fetchMonthlyReport(month, currentPage, pageSize)
  }

  // Handle thay đổi tháng
  const handleMonthChange = (date: Dayjs | null) => {
    if (date) {
      setSelectedMonth(date)
      setCurrentPage(1) // Reset về trang 1 khi đổi tháng
    }
  }

  // Handle pagination change
  const handleTableChange = (pagination: any) => {
    const month = selectedMonth.format('YYYY-MM')
    setCurrentPage(pagination.current)
    setPageSize(pagination.pageSize)
    fetchMonthlyReport(month, pagination.current, pagination.pageSize)
  }

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

  const getColumnSearchProps = (dataIndex: keyof ExportDataRecord) => ({
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
    onFilter: (value: any, record: ExportDataRecord) =>
      record[dataIndex]
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

  const tagColors: Record<string, string> = {
    'Đúng giờ': 'green',
    'Đi muộn': 'volcano',
    'Đi muộn sau 8:30': 'red',
    'Về sớm': 'orange',
    'Vắng sáng': 'geekblue',
    'Vắng chiều': 'purple',
    'Nghỉ cả ngày': 'default',
    'Có phép': 'blue',
  }

  const columns: ColumnsType<ExportDataRecord> = [
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
      title: 'Thứ',
      dataIndex: 'dayOfWeek',
      key: 'dayOfWeek',
      width: 100,
      render: (dayOfWeek: string) => dayOfWeek,
    },
    {
      title: 'Check in',
      dataIndex: 'checkIn',
      key: 'checkIn',
      width: 105,
      render: (checkIn: string) => (
        checkIn !== '-' ? checkIn : <span style={{ color: '#999' }}>-</span>
      ),
    },
    {
      title: 'Check out',
      dataIndex: 'checkOut',
      key: 'checkOut',
      width: 105,
      render: (checkOut: string) => (
        checkOut !== '-' ? checkOut : <span style={{ color: '#999' }}>-</span>
      ),
    },
    {
      title: 'Tổng giờ',
      dataIndex: 'totalHours',
      key: 'totalHours',
      width: 110,
      sorter: (a, b) => {
        const getMinutes = (time: string) => {
          const match = time.match(/(\d+)h\s*(\d+)m/)
          if (!match) return 0
          return parseInt(match[1]) * 60 + parseInt(match[2])
        }
        return getMinutes(a.totalHours) - getMinutes(b.totalHours)
      },
    },
    // {
    //   title: 'Phạt tiền',
    //   dataIndex: 'fine',
    //   key: 'fine',
    //   width: 120,
    //   render: (fine: string) => (
    //     <span style={{
    //       color: fine !== '0đ' ? '#ff4d4f' : '#52c41a',
    //       fontWeight: fine !== '0đ' ? 600 : 400
    //     }}>
    //       {fine}
    //     </span>
    //   ),
    //   sorter: (a, b) => {
    //     const getValue = (fine: string) => {
    //       return parseInt(fine.replace(/[^\d]/g, '')) || 0
    //     }
    //     return getValue(a.fine) - getValue(b.fine)
    //   },
    // },
    // {
    //   title: 'Ghi chú',
    //   dataIndex: 'note',
    //   key: 'note',
    //   render: (notes: string[]) => (
    //     <>
    //       {notes.map((note) => (
    //         <Tag color={tagColors[note] || 'default'} key={note} style={{ marginBottom: 4 }}>
    //           {note}
    //         </Tag>
    //       ))}
    //     </>
    //   ),
    // },
  ]

  // Hàm xử lý khi Clear tất cả filters
  const handleClearFilters = () => {
    setFilterMonth(dayjs()) // Reset về tháng hiện tại
    setFilterDate(null) // Xóa ngày đã chọn
    setFilterName('') // Xóa tên
    setFilterDepartment(undefined) // Xóa phòng ban
  }

  // Hàm để apply filters vào data
  const getFilteredData = () => {
    let filtered = [...data]

    // Filter theo tên nhân viên
    if (filterName) {
      filtered = filtered.filter(item =>
        item.employeeName.toLowerCase().includes(filterName.toLowerCase())
      )
    }

    // Filter theo ngày cụ thể
    if (filterDate) {
      const dateStr = filterDate.format('YYYY-MM-DD')
      filtered = filtered.filter(item => item.date === dateStr)
    }

    // TODO: Filter theo phòng ban (cần thêm department_id vào data từ API)
    // if (filterDepartment) {
    //   filtered = filtered.filter(item => item.department_id === filterDepartment)
    // }

    return filtered
  }

  return (
    <div style={{ padding: '0 0 16px 0' }}>
      {/* Filter Card */}
      <Card
        style={{
          marginBottom: 16,
          boxShadow: '0 2px 16px rgba(0,0,0,0.12)',
          borderRadius: 8,
        }}
        title="Bộ lọc"
        extra={
          <Button
            icon={<ClearOutlined />}
            onClick={handleClearFilters}
            size="middle"
            style={{
              borderColor: '#1890ff', // xanh chuẩn Ant Design
              color: '#1890ff',       // chữ + icon cùng màu
            }}
            
          >
            Xóa bộ lọc
          </Button>
        }
      >
        <Row gutter={[16, 16]}>
          {/* Filter Tháng */}
          <Col xs={24} sm={12} md={6}>
            <div style={{ marginBottom: 4, fontSize: 14, fontWeight: 500 }}>Tháng</div>
            <DatePicker
              picker="month"
              value={filterMonth}
              onChange={(date) => {
                setFilterMonth(date)
                // Auto-apply: Khi đổi tháng thì gọi API ngay
                if (date) {
                  setSelectedMonth(date)
                  setCurrentPage(1)
                }
              }}
              format="YYYY-MM"
              placeholder="Chọn tháng"
              style={{ width: '100%' }}
              allowClear={false}
            />
          </Col>

          {/* Filter Ngày */}
          <Col xs={24} sm={12} md={6}>
            <div style={{ marginBottom: 4, fontSize: 14, fontWeight: 500 }}>Ngày</div>
            <DatePicker
              value={filterDate}
              onChange={(date) => {
                setFilterDate(date)
                // Auto-apply: Filter sẽ tự động áp dụng khi render lại
              }}
              format="YYYY-MM-DD"
              placeholder="Chọn ngày cụ thể"
              style={{ width: '100%' }}
            />
          </Col>

          {/* Filter Tên */}
          <Col xs={24} sm={12} md={6}>
            <div style={{ marginBottom: 4, fontSize: 14, fontWeight: 500 }}>Tên nhân viên</div>
            <Input
              placeholder="Nhập tên nhân viên"
              value={filterName}
              onChange={(e) => {
                setFilterName(e.target.value)
                // Auto-apply: Filter sẽ tự động áp dụng khi render lại
              }}
              allowClear
            />
          </Col>

          {/* Filter Phòng ban */}
          <Col xs={24} sm={12} md={6}>
            <div style={{ marginBottom: 4, fontSize: 14, fontWeight: 500 }}>Phòng ban</div>
            <Select
              placeholder="Chọn phòng ban"
              value={filterDepartment}
              onChange={(value) => {
                setFilterDepartment(value)
                // Auto-apply: Filter sẽ tự động áp dụng khi render lại
              }}
              style={{ width: '100%' }}
              allowClear
              loading={departmentsLoading}
              options={departments.map(dept => ({
                label: dept.name,
                value: dept.id,
              }))}
            />
          </Col>
        </Row>
      </Card>

      {/* Table Card */}
      <div style={{
        boxShadow: '0 2px 16px rgba(0,0,0,0.12)',
        borderRadius: 8,
        overflow: 'hidden'
      }}>
        <Table<ExportDataRecord>
          columns={columns}
          dataSource={getFilteredData()} // Sử dụng filtered data thay vì data gốc
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} bản ghi`,
            pageSizeOptions: ['10', '20', '50', '100'],
            style: {
              paddingRight: '8px',
            },
          }}
          onChange={handleTableChange}
          scroll={{ x: 900 }}
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
                Dữ liệu xuất báo cáo
              </div>
              <div style={{
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap'
              }}>
                <DatePicker
                  picker="month"
                  allowClear={false}
                  value={selectedMonth}
                  onChange={handleMonthChange}
                  format="YYYY-MM"
                  style={{ width: 105 }}
                />
                <Button
                  type="primary"
                  loading={loading}
                  onClick={handleRefresh}
                >
                  Làm mới
                </Button>
                <Button
                  type="primary"
                  loading={loadings[1]}
                  onClick={() => {
                    message.info('Tính năng xuất Excel đang phát triển')
                  }}
                >
                  Xuất Excel
                </Button>
              </div>
            </div>
          )}
        />
      </div>
    </div>
  )
}

export default ExportData
