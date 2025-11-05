import React, { useState, useRef, useEffect } from 'react'
import { Table, Button, DatePicker, Input, Space, message, Card, Row, Col, Select } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { FilterDropdownProps } from 'antd/es/table/interface'
import { SearchOutlined, ClearOutlined, DownloadOutlined, LoadingOutlined } from '@ant-design/icons'
import type { InputRef } from 'antd'
import Highlighter from 'react-highlight-words'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { exportdataApi } from '@/api'
import { useDepartments } from '../../contexts/DepartmentsContext'
import { useUsers } from '../../contexts/UsersContext'

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

const ExportData: React.FC = () => {
  const [searchText, setSearchText] = useState('')
  const [searchedColumn, setSearchedColumn] = useState('')
  const searchInput = useRef<InputRef>(null)

  // API states
  const [data, setData] = useState<ExportDataRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(100)
  const [total, setTotal] = useState(0)
  const [exportLoading, setExportLoading] = useState(false)

  // Filter states - Các state để quản lý filters cho API
  const [filterMonth, setFilterMonth] = useState<Dayjs>(dayjs()) // Tháng được chọn
  const [filterDate, setFilterDate] = useState<Dayjs | null>(null) // Ngày cụ thể
  const [filterUserId, setFilterUserId] = useState<string | undefined>(undefined) // User ID của nhân viên
  const [filterDepartment, setFilterDepartment] = useState<string | undefined>(undefined) // Tên phòng ban

  // Lấy danh sách phòng ban và users từ Context
  const { departments, loading: departmentsLoading } = useDepartments()
  const { users, loading: usersLoading } = useUsers()

  // Function để fetch data từ API với filters
  const fetchMonthlyReport = async (
    month: string,
    page: number,
    limit: number,
    userId?: string,
    date?: string,
    department?: string
  ) => {
    try {
      setLoading(true)
      
      // Build params cho API
      const params: any = {
        month,
        page,
        limit
      }

      // Thêm filters nếu có
      if (userId) params.user_id = userId
      if (date) params.date = date
      if (department) params.department = department

      const response: ApiResponse = await exportdataApi.getMonthlyAttendanceReport(params)

      // Transform data từ API sang format của Table
      const transformedData: ExportDataRecord[] = []

      response.data.forEach((user) => {
        user.attendances.forEach((attendance) => {
          const attendanceDate = dayjs(attendance.date)
          const dayOfWeek = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'][attendanceDate.day()]

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

      // Hiển thị message thành công
      message.success(response.message || `Successfully loaded ${transformedData.length} records`)

    } catch (error: any) {
      console.error('Error fetching monthly report:', error)
      message.error(error?.response?.data?.detail || 'Failed to load monthly report')
    } finally {
      setLoading(false)
    }
  }

  // Helper function để tính tổng giờ làm việc
  // Quy tắc: 
  // - Nếu check out trước 13h30: Tổng giờ = 12h - check in
  // - Nếu check out sau hoặc bằng 13h30: Tổng giờ = check out - check in - 1.5h (nghỉ trưa)
  const calculateTotalHours = (checkIn: string | null, checkOut: string | null): string => {
    if (!checkIn || !checkOut) return '0h 0m'

    const start = dayjs(checkIn)
    const end = dayjs(checkOut)
    
    // Kiểm tra check out có trước 13h30 không
    const checkOutHour = end.hour()
    const checkOutMinute = end.minute()
    const isBeforeLunch = checkOutHour < 13 || (checkOutHour === 13 && checkOutMinute < 30)
    
    let totalMinutes: number
    
    // Nếu check out trước 13h30: Tổng giờ = 12h - check in
    if (isBeforeLunch) {
      const noon = dayjs(start).hour(12).minute(0).second(0).millisecond(0)
      totalMinutes = noon.diff(start, 'minute')
    } 
    // Nếu check out sau hoặc bằng 13h30: Tổng giờ = check out - check in - 1.5h (90 phút)
    else {
      const diffMinutes = end.diff(start, 'minute')
      totalMinutes = diffMinutes - 90 // Trừ 1.5h nghỉ trưa
    }
    
    // Đảm bảo không âm
    if (totalMinutes < 0) totalMinutes = 0
    
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60

    return `${hours}h ${minutes}m`
  }

  // useEffect để auto-apply filters khi thay đổi
  useEffect(() => {
    const month = filterMonth.format('YYYY-MM')
    const date = filterDate ? filterDate.format('YYYY-MM-DD') : undefined
    
    fetchMonthlyReport(
      month,
      currentPage,
      pageSize,
      filterUserId,
      date,
      filterDepartment
    )
  }, [filterMonth, filterDate, filterUserId, filterDepartment, currentPage, pageSize])

  // Hàm xử lý khi Clear tất cả filters
  const handleClearFilters = () => {
    setFilterMonth(dayjs()) // Reset về tháng hiện tại
    setFilterDate(null) // Xóa ngày đã chọn
    setFilterUserId(undefined) // Xóa user đã chọn
    setFilterDepartment(undefined) // Xóa phòng ban
    setCurrentPage(1) // Reset về trang 1
    
    // API sẽ được gọi lại tự động qua useEffect
  }

  // Handle làm mới data
  const handleRefresh = () => {
    const month = filterMonth.format('YYYY-MM')
    const date = filterDate ? filterDate.format('YYYY-MM-DD') : undefined
    
    fetchMonthlyReport(
      month,
      currentPage,
      pageSize,
      filterUserId,
      date,
      filterDepartment
    )
  }

  // Handle xuất Excel
  const handleExportExcel = async () => {
    try {
      setExportLoading(true)
      
      // Gửi filters (KHÔNG gửi data)
      await exportdataApi.exportMonthlyReportToExcel({
        month: filterMonth.format('YYYY-MM'),
        user_id: filterUserId,
        date: filterDate ? filterDate.format('YYYY-MM-DD') : undefined,
        department: filterDepartment,
      })
      
      // Hiển thị thông báo thành công
      message.success('Export Excel successful')
      
    } catch (error: any) {
      console.error('Error exporting Excel:', error)
      message.error(error?.response?.data?.detail || 'Failed to export Excel')
    } finally {
      setExportLoading(false)
    }
  }

  // Handle pagination change
  const handleTableChange = (pagination: any) => {
    setCurrentPage(pagination.current)
    setPageSize(pagination.pageSize)
    // API sẽ được gọi lại tự động qua useEffect
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
  ]

  return (
    <div style={{ padding: '0 0 16px 0' }}>
      {/* Filter Card */}
      <Card
        style={{
          marginBottom: 8,
          boxShadow: '0 2px 16px rgba(0,0,0,0.12)',
          borderRadius: 8,
        }}
        title="Bộ lọc"
        extra={
          <Space>
            <Button
              size="middle"
              type="primary"
              loading={loading}
              onClick={handleRefresh}
            >
              Làm mới
            </Button>

            <Button
              icon={<ClearOutlined />}
              onClick={handleClearFilters}
              size="middle"
              danger
            >
              Xóa bộ lọc
            </Button>
          </Space>
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
                if (date) {
                  setFilterMonth(date)
                  setCurrentPage(1) // Reset về trang 1 khi đổi tháng
                  // API sẽ được gọi tự động qua useEffect
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
                setCurrentPage(1) // Reset về trang 1 khi đổi filter
                // API sẽ được gọi tự động qua useEffect
              }}
              format="YYYY-MM-DD"
              placeholder="Chọn ngày cụ thể"
              style={{ width: '100%' }}
            />
          </Col>

          {/* Filter Tên nhân viên */}
          <Col xs={24} sm={12} md={6}>
            <div style={{ marginBottom: 4, fontSize: 14, fontWeight: 500 }}>Tên nhân viên</div>
            <Select
              showSearch
              placeholder="Chọn nhân viên"
              value={filterUserId}
              onChange={(value) => {
                setFilterUserId(value)
                setCurrentPage(1) // Reset về trang 1 khi đổi filter
                // API sẽ được gọi tự động qua useEffect
              }}
              style={{ width: '100%' }}
              allowClear
              loading={usersLoading}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={users.map(user => ({
                label: user.full_name,
                value: user.id,
              }))}
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
                setCurrentPage(1) // Reset về trang 1 khi đổi filter
                // API sẽ được gọi tự động qua useEffect
              }}
              style={{ width: '100%' }}
              allowClear
              loading={departmentsLoading}
              options={departments.map(dept => ({
                label: dept.name,
                value: dept.name, // Sử dụng dept.name thay vì dept.id vì backend filter theo string
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
          dataSource={data} // Sử dụng data từ API trực tiếp (không filter frontend)
          loading={{
            spinning: loading,
            indicator: <LoadingOutlined spin />,
            tip: 'Loading all attendance data...',
        }}
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
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  loading={exportLoading}
                  onClick={handleExportExcel}
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
