import React from 'react'
import { Modal, Descriptions, Image, Tabs, Form, Select, Input, Upload, Button, message, Card } from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import type { UploadProps } from 'antd'

const { TextArea } = Input
const { Dragger } = Upload

interface AttendanceDetailModalProps {
    open: boolean
    onClose: () => void
    record: {
        date: string
        checkIn: string
        checkOut: string
        lastRecord: string
        note: string[]
    } | null
}

const AttendanceDetailModal: React.FC<AttendanceDetailModalProps> = ({ open, onClose, record }) => {
    const [bugForm] = Form.useForm()
    const [leaveForm] = Form.useForm()

    if (!record) return null

    // Mock data - thay bằng data thật
    const workingHours = '8h 30m'

    const status = record.checkIn !== '-' && record.checkOut !== '-' ? 'Đầy đủ' : 'Thiếu chấm công'

    const uploadProps: UploadProps = {
        name: 'file',
        multiple: true,
        action: '/api/upload', // Thay bằng API endpoint thật
        onChange(info) {
            const { status } = info.file
            if (status === 'done') {
                message.success(`${info.file.name} tải lên thành công.`)
            } else if (status === 'error') {
                message.error(`${info.file.name} tải lên thất bại.`)
            }
        },
        beforeUpload: (file) => {
            const isLt10M = file.size / 1024 / 1024 < 10
            if (!isLt10M) {
                message.error('Kích thước file phải nhỏ hơn 10MB!')
            }
            return isLt10M
        },
    }

    const handleSubmitBug = (values: any) => {
        console.log('Bug report:', values)
        message.success('Đã gửi báo lỗi thành công!')
        bugForm.resetFields()
    }

    const handleSubmitLeave = (values: any) => {
        console.log('Leave request:', values)
        message.success('Đã gửi xin phép thành công!')
        leaveForm.resetFields()
    }

    const tabItems = [
        {
            key: 'bug',
            label: 'Báo lỗi',
            children: (
                <Form
                    form={bugForm}
                    layout="vertical"
                    onFinish={handleSubmitBug}
                >
                    <Form.Item
                        label="Loại lỗi"
                        name="bugType"
                        rules={[{ required: true, message: 'Vui lòng chọn loại lỗi' }]}
                    >
                        <Select placeholder="Chọn loại lỗi">
                            <Select.Option value="no-recognition">Không nhận diện</Select.Option>
                            <Select.Option value="not-working">Không hoạt động</Select.Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        label="Thời gian lỗi"
                        name="bugTime"
                        rules={[{ required: true, message: 'Vui lòng chọn thời gian lỗi' }]}
                    >
                        <Select placeholder="Chọn thời gian">
                            <Select.Option value="morning">Buổi sáng</Select.Option>
                            <Select.Option value="afternoon">Buổi chiều</Select.Option>
                            <Select.Option value="all-day">Cả ngày</Select.Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        label="Mô tả"
                        name="description"
                        rules={[{ required: false, message: 'Vui lòng nhập mô tả' }]}
                    >
                        <TextArea
                            rows={3}
                            placeholder="Mô tả chi tiết về lỗi..."
                            maxLength={500}
                            showCount
                        />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" block>
                            Gửi báo lỗi
                        </Button>
                    </Form.Item>
                </Form>
            ),
        },
        {
            key: 'leave',
            label: 'Xin phép',
            children: (
                <Form
                    form={leaveForm}
                    layout="vertical"
                    onFinish={handleSubmitLeave}
                >
                    <Form.Item
                        label="Loại phép"
                        name="leaveType"
                        rules={[{ required: true, message: 'Vui lòng chọn loại phép' }]}
                    >
                        <Select placeholder="Chọn loại phép">
                            <Select.Option value="late">Đi muộn</Select.Option>
                            <Select.Option value="early-leave">Về sớm</Select.Option>
                            <Select.Option value="morning-off">Nghỉ sáng</Select.Option>
                            <Select.Option value="afternoon-off">Nghỉ chiều</Select.Option>
                            <Select.Option value="all-day-off">Nghỉ cả ngày</Select.Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        label="Mô tả"
                        name="description"
                        rules={[{ required: false, message: 'Vui lòng nhập mô tả' }]}
                    >
                        <TextArea
                            rows={3}
                            placeholder="Lý do xin phép..."
                            maxLength={500}
                            showCount
                        />
                    </Form.Item>

                    <Form.Item
                        label="Tài liệu đính kèm (nếu có)"
                        name="attachments"
                    >
                        <Dragger {...uploadProps}>
                            <p className="ant-upload-drag-icon">
                                <InboxOutlined />
                            </p>
                            <p className="ant-upload-text">Click hoặc kéo thả file vào đây</p>
                            <p className="ant-upload-hint">
                                Hỗ trợ tải lên đơn hoặc nhiều file. Kích thước tối đa 10MB/file.
                            </p>
                        </Dragger>
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" block>
                            Gửi xin phép
                        </Button>
                    </Form.Item>
                </Form>
            ),
        },
    ]

    return (
        <Modal
            title={`Chi tiết chấm công: ${record.date}`}
            open={open}
            onCancel={onClose}
            footer={null}
            width={800}
            centered
            style={{ top: 8, paddingBottom: 8 }}
            styles={{
                body: {
                    maxHeight: 'calc(100vh - 16px - 55px - 24px)',
                    overflowY: 'auto',
                }
            }}
        >
            <Card
                title="Thông tin chấm công"
                style={{
                    marginBottom: 8,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03), 0 1px 6px -1px rgba(0,0,0,0.02), 0 2px 4px rgba(0,0,0,0.02)',
                }}
                size="small"
            >
                <Descriptions
                    bordered
                    column={{ xs: 1, sm: 2, md: 2, lg: 2, xl: 2, xxl: 2 }}
                    size="small"
                    styles={{
                        label: { width: '25%' },
                        content: { width: '25%' },
                    }}
                >
                    <Descriptions.Item label="Giờ vào" span={1}>
                        {record.checkIn !== '-' ? record.checkIn : <span style={{ color: '#999' }}>Chưa chấm</span>}
                    </Descriptions.Item>
                    <Descriptions.Item label="Giờ ra" span={1}>
                        {record.checkOut !== '-' ? record.checkOut : <span style={{ color: '#999' }}>Chưa chấm</span>}
                    </Descriptions.Item>
                    <Descriptions.Item label="Thời gian làm việc" span={1}>
                        {workingHours}
                    </Descriptions.Item>
                    <Descriptions.Item label="Trạng thái" span={1}>
                        <span style={{ color: status === 'Đầy đủ' ? '#52c41a' : '#ff4d4f' }}>
                            {status}
                        </span>
                    </Descriptions.Item>
                </Descriptions>
            </Card>

            <Card
                title="Ảnh chấm công"
                style={{
                    marginBottom: 8,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03), 0 1px 6px -1px rgba(0,0,0,0.02), 0 2px 4px rgba(0,0,0,0.02)'
                }}
                size="small"
            >
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: 16
                }}>
                    {/* Check In */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: 8,
                        border: '1px solid #f0f0f0',
                        borderRadius: 8,
                        background: '#fafafa'
                    }}>
                        <div style={{
                            fontSize: 14,
                            fontWeight: 600,
                            marginBottom: 4,
                            color: '#1890ff'
                        }}>
                            Check in
                        </div>
                        <div style={{
                            fontSize: 13,
                            color: '#666',
                        }}>
                        </div>
                        <Image
                            width={300}
                            height={200}
                            src="https://zos.alipayobjects.com/rmsportal/jkjgkEfvpUPVyRjUImniVslZfWPnJuuZ.png"
                            alt="Check in"
                            style={{
                                borderRadius: 8,
                                objectFit: 'cover',
                                border: '2px solid #e8e8e8'
                            }}
                        />
                        <Button
                            danger
                            size="small"
                            style={{
                                marginTop: 8,
                                marginBottom: 8,
                            }}
                            onClick={() => {
                                message.warning('Đã gửi báo cáo ảnh không đúng!')
                            }}
                        >
                            Đây không phải tui
                        </Button>
                    </div>

                    {/* Check Out */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: 8,
                        border: '1px solid #f0f0f0',
                        borderRadius: 8,
                        background: '#fafafa'
                    }}>
                        <div style={{
                            fontSize: 14,
                            fontWeight: 600,
                            marginBottom: 4,
                            color: '#52c41a'
                        }}>
                            Check out
                        </div>
                        <div style={{
                            fontSize: 13,
                            color: '#666',
                        }}>
                        </div>
                        <Image
                            width={300}
                            height={200}
                            src="https://cellphones.com.vn/sforum/wp-content/uploads/2024/04/anh-chan-dung-2.jpg"
                            alt="Check out"
                            style={{
                                borderRadius: 8,
                                objectFit: 'cover',
                                border: '2px solid #e8e8e8'
                            }}
                        />
                        <Button
                            danger
                            size="small"
                            style={{
                                marginTop: 8,
                                marginBottom: 8,
                            }}
                            onClick={() => {
                                message.warning('Đã gửi báo cáo ảnh không đúng!')
                            }}
                        >
                            Đây không phải tui
                        </Button>
                    </div>
                </div>
            </Card>

            <Card
                title="Báo cáo"
                size="small"
                style={{
                    marginBottom: 8,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03), 0 1px 6px -1px rgba(0,0,0,0.02), 0 2px 4px rgba(0,0,0,0.02)'
                }}
            >
                <Tabs items={tabItems} />
            </Card>
        </Modal>
    )
}

export default AttendanceDetailModal
