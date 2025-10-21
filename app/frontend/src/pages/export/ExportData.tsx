import React, { useState, useRef } from 'react'
import { Table, Tag, Button, DatePicker, Input, Space } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { FilterDropdownProps } from 'antd/es/table/interface'
import { SearchOutlined } from '@ant-design/icons'
import type { InputRef } from 'antd'
import Highlighter from 'react-highlight-words'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'

interface ExportDataRecord {
  key: string
  employeeName: string
  date: string
  checkIn: string
  checkOut: string
  totalHours: string
  fine: string
  note: string[]
}

const { RangePicker } = DatePicker;

const ExportData: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState<Dayjs>(dayjs())
  const [searchText, setSearchText] = useState('')
  const [searchedColumn, setSearchedColumn] = useState('')
  const searchInput = useRef<InputRef>(null)

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

  // Mock data
  const data: ExportDataRecord[] = [
    {
      key: '1',
      employeeName: 'Nguyễn Văn A',
      date: '2025-10-16',
      checkIn: '08:05',
      checkOut: '17:30',
      totalHours: '8h 30m',
      fine: '0đ',
      note: ['Đúng giờ'],
    },
    {
      key: '2',
      employeeName: 'Trần Thị B',
      date: '2025-10-16',
      checkIn: '08:15',
      checkOut: '17:00',
      totalHours: '8h 0m',
      fine: '50,000đ',
      note: ['Đi muộn', 'Về sớm'],
    },
    {
      key: '3',
      employeeName: 'Lê Văn C',
      date: '2025-10-16',
      checkIn: '07:55',
      checkOut: '17:35',
      totalHours: '8h 40m',
      fine: '0đ',
      note: ['Đúng giờ'],
    },
    {
      key: '4',
      employeeName: 'Phạm Thị D',
      date: '2025-10-16',
      checkIn: '-',
      checkOut: '-',
      totalHours: '0h',
      fine: '0đ',
      note: ['Nghỉ cả ngày', 'Có phép'],
    },
    {
      key: '5',
      employeeName: 'Hoàng Văn E',
      date: '2025-10-16',
      checkIn: '08:35',
      checkOut: '17:25',
      totalHours: '8h 0m',
      fine: '100,000đ',
      note: ['Đi muộn sau 8:30'],
    },
    {
      key: '6',
      employeeName: 'Võ Thị F',
      date: '2025-10-16',
      checkIn: '08:02',
      checkOut: '-',
      totalHours: '0h',
      fine: '50,000đ',
      note: ['Vắng chiều'],
    },
    {
      key: '7',
      employeeName: 'Nguyễn Văn G',
      date: '2025-10-16',
      checkIn: '-',
      checkOut: '-',
      totalHours: '0h',
      fine: '0đ',
      note: ['Nghỉ cả ngày'],
    },
    {
      key: '8',
      employeeName: 'Trần Thị H',
      date: '2025-10-16',
      checkIn: '-',
      checkOut: '-',
      totalHours: '0h',
      fine: '0đ',
      note: ['Nghỉ cả ngày'],
    },
    {
      key: '9',
      employeeName: 'Nguyễn Văn I',
      date: '2025-10-16',
      checkIn: '-',
      checkOut: '-',
      totalHours: '0h',
      fine: '0đ',
      note: ['Nghỉ cả ngày'],
    },
    {
      key: '10',
      employeeName: 'Trần Thị J',
      date: '2025-10-16',
      checkIn: '-',
      checkOut: '-',
      totalHours: '0h',
      fine: '0đ',
      note: ['Nghỉ cả ngày'],
    },
  ]

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
      sorter: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    },
    {
      title: 'Check in',
      dataIndex: 'checkIn',
      key: 'checkIn',
      width: 105,
      render: (checkIn: string) => (
        checkIn !== '-' ? checkIn : <span style={{ color: '#999' }}>—</span>
      ),
    },
    {
      title: 'Check out',
      dataIndex: 'checkOut',
      key: 'checkOut',
      width: 105,
      render: (checkOut: string) => (
        checkOut !== '-' ? checkOut : <span style={{ color: '#999' }}>—</span>
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
    {
      title: 'Phạt tiền',
      dataIndex: 'fine',
      key: 'fine',
      width: 120,
      render: (fine: string) => (
        <span style={{
          color: fine !== '0đ' ? '#ff4d4f' : '#52c41a',
          fontWeight: fine !== '0đ' ? 600 : 400
        }}>
          {fine}
        </span>
      ),
      sorter: (a, b) => {
        const getValue = (fine: string) => {
          return parseInt(fine.replace(/[^\d]/g, '')) || 0
        }
        return getValue(a.fine) - getValue(b.fine)
      },
    },
    {
      title: 'Ghi chú',
      dataIndex: 'note',
      key: 'note',
      render: (notes: string[]) => (
        <>
          {notes.map((note) => (
            <Tag color={tagColors[note] || 'default'} key={note} style={{ marginBottom: 4 }}>
              {note}
            </Tag>
          ))}
        </>
      ),
    },
  ]

  return (
    <div style={{
      boxShadow: '0 1px 2px rgba(0,0,0,0.03), 0 1px 6px -1px rgba(0,0,0,0.02), 0 2px 4px rgba(0,0,0,0.02)',
      borderRadius: 8,
      overflow: 'hidden'
    }}>
      <Table<ExportDataRecord>
        columns={columns}
        dataSource={data}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (total) => `Tổng ${total} bản ghi`,
        }}
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
            <div style={{ display: 'flex', gap: 8 }}>
              <RangePicker
                allowClear={false}
                style={{ width: 230 }}
                placeholder={['Từ ngày', 'Đến ngày']}
              />
              <Button type="primary" loading={loadings[0]} onClick={() => enterLoading(0)}>
                Làm mới
              </Button>
              <Button type="primary" loading={loadings[1]} onClick={() => enterLoading(1)}>
                Xuất Excel
              </Button>
            </div>
          </div>
        )}
      />
    </div>
  )
}

export default ExportData