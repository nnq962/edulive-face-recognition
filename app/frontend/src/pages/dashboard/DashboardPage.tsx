import { Link } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Typography,
  Statistic,
  Flex,
  Button,
  Divider,
  Table,
  Tag,
} from 'antd';
import {
  TeamOutlined,
  CheckCircleOutlined,
  FieldTimeOutlined,
  CloseCircleOutlined,
  CalendarOutlined,
  FileExcelOutlined,
  SettingOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

type RecordRow = {
  key: string;
  name: string;
  checkIn: string;
  checkOut: string;
  status: 'Đúng giờ' | 'Đi muộn' | 'Vắng';
};

const dataSource: RecordRow[] = [
  { key: '1', name: 'Nguyễn Văn A', checkIn: '08:01', checkOut: '17:06', status: 'Đúng giờ' },
  { key: '2', name: 'Trần Thị B', checkIn: '08:17', checkOut: '17:09', status: 'Đi muộn' },
  { key: '3', name: 'Lê Văn C', checkIn: '-',     checkOut: '-',     status: 'Vắng' },
  { key: '4', name: 'Phạm Thị D', checkIn: '07:58', checkOut: '17:02', status: 'Đúng giờ' },
];

export default function DashboardPage() {
  return (
    <Flex vertical gap={16}>
      {/* Header */}
      <Flex align="center" justify="space-between">
        <div>
          <Title level={3} style={{ margin: 0 }}>Dashboard chấm công</Title>
          <Text type="secondary">Tổng quan hôm nay và lối tắt tới các chức năng</Text>
        </div>
      </Flex>

      {/* KPI cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Flex align="center" gap={12}>
              <TeamOutlined />
              <Statistic title="Tổng nhân sự" value={128} />
            </Flex>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Flex align="center" gap={12}>
              <CheckCircleOutlined />
              <Statistic title="Đi làm" value={112} />
            </Flex>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Flex align="center" gap={12}>
              <FieldTimeOutlined />
              <Statistic title="Đi muộn" value={9} />
            </Flex>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Flex align="center" gap={12}>
              <CloseCircleOutlined />
              <Statistic title="Vắng" value={7} />
            </Flex>
          </Card>
        </Col>
      </Row>

      {/* Quick nav */}
      <Card>
        <Title level={5} style={{ marginTop: 0 }}>Điều hướng nhanh</Title>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Card>
              <Flex vertical gap={8}>
                <Flex align="center" gap={8}>
                  <CalendarOutlined />
                  <Title level={5} style={{ margin: 0 }}>Theo dõi chấm công</Title>
                </Flex>
                <Text type="secondary">
                  Xem bảng công theo ngày/tuần/tháng, lọc theo phòng ban.
                </Text>
                <Link to="/attendance">
                  <Button type="primary" block>Vào trang</Button>
                </Link>
              </Flex>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card>
              <Flex vertical gap={8}>
                <Flex align="center" gap={8}>
                  <FileExcelOutlined />
                  <Title level={5} style={{ margin: 0 }}>Xuất báo cáo</Title>
                </Flex>
                <Text type="secondary">
                  Xuất file công (CSV/Excel) theo kỳ hoặc theo bộ phận.
                </Text>
                <Link to="/reports">
                  <Button type="primary" block>Vào trang</Button>
                </Link>
              </Flex>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card>
              <Flex vertical gap={8}>
                <Flex align="center" gap={8}>
                  <SettingOutlined />
                  <Title level={5} style={{ margin: 0 }}>Cài đặt</Title>
                </Flex>
                <Text type="secondary">
                  Thiết lập ca làm, ngày nghỉ, phân quyền, đồng bộ thiết bị.
                </Text>
                <Link to="/settings">
                  <Button type="primary" block>Vào trang</Button>
                </Link>
              </Flex>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Recent table */}
      <Card>
        <Flex align="center" justify="space-between">
          <Title level={5} style={{ margin: 0 }}>Điểm danh gần đây</Title>
        </Flex>
        <Divider style={{ margin: '12px 0' }} />
        <Table
          rowKey="key"
          dataSource={dataSource}
          pagination={{ pageSize: 5, hideOnSinglePage: true }}
          columns={[
            { title: 'Nhân viên', dataIndex: 'name' },
            { title: 'Vào', dataIndex: 'checkIn', width: 120 },
            { title: 'Ra', dataIndex: 'checkOut', width: 120 },
            {
              title: 'Trạng thái',
              dataIndex: 'status',
              width: 140,
              render: (v: RecordRow['status']) => {
                if (v === 'Đúng giờ') return <Tag color="success">Đúng giờ</Tag>;
                if (v === 'Đi muộn') return <Tag color="warning">Đi muộn</Tag>;
                return <Tag color="error">Vắng</Tag>;
              },
            },
          ]}
        />
      </Card>
    </Flex>
  );
}