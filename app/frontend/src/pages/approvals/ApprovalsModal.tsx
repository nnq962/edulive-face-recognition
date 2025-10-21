import React, { useState } from 'react';
import { Modal, Button, Input, Descriptions, Tag, Space, message } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';

const { TextArea } = Input;

interface ReportData {
    key: string;
    employeeName: string;
    date: string;
    reportType: string;
    subType?: string;
    description: string;
    createdAt: string;
    status: 'pending' | 'approved' | 'rejected';
    approvedBy?: string;
    feedback?: string;
}

interface ApprovalsModalProps {
    open: boolean;
    onClose: () => void;
    reportData: ReportData | null;
}

const ApprovalsModal: React.FC<ApprovalsModalProps> = ({ open, onClose, reportData }) => {
    const [feedback, setFeedback] = useState('');
    const [loading, setLoading] = useState(false);

    const handleApprove = async () => {
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            message.success('Đã chấp nhận báo cáo');
            setLoading(false);
            setFeedback('');
            onClose();
        }, 1000);
    };

    const handleReject = async () => {
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            message.warning('Đã từ chối báo cáo');
            setLoading(false);
            setFeedback('');
            onClose();
        }, 1000);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending':
                return 'gold';
            case 'approved':
                return 'green';
            case 'rejected':
                return 'red';
            default:
                return 'default';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'pending':
                return 'Chờ duyệt';
            case 'approved':
                return 'Đã duyệt';
            case 'rejected':
                return 'Từ chối';
            default:
                return status;
        }
    };

    const getReportTypeColor = (reportType: string) => {
        switch (reportType) {
            case 'Feedback':
                return 'blue';
            case 'Máy lỗi':
                return 'red';
            case 'Xin phép':
                return 'orange';
            default:
                return 'default';
        }
    };

    if (!reportData) return null;

    return (
        <Modal
            title="Duyệt báo cáo"
            centered
            open={open}
            onCancel={onClose}
            footer={null}
            width={{
                xs: '90%',
                sm: '80%',
                md: '70%',
                lg: '60%',
                xl: '50%',
                xxl: '40%',
            }}
        >
            <Descriptions
                bordered
                column={1}
                size="small"
                style={{ marginBottom: 16 }}
                styles={{
                    label: { width: 130, fontWeight: 500 },
                }}
            >
                <Descriptions.Item label="Tên nhân viên">
                    <strong>{reportData.employeeName}</strong>
                </Descriptions.Item>
                <Descriptions.Item label="Ngày">
                    {reportData.date}
                </Descriptions.Item>
                <Descriptions.Item label="Loại báo cáo">
                    <Tag color={getReportTypeColor(reportData.reportType)}>
                        {reportData.reportType}
                    </Tag>
                </Descriptions.Item>
                {reportData.subType && (
                    <Descriptions.Item label="Chi tiết">
                        <Tag>{reportData.subType}</Tag>
                    </Descriptions.Item>
                )}
                <Descriptions.Item label="Mô tả">
                    {reportData.description}
                </Descriptions.Item>
                <Descriptions.Item label="Tạo lúc">
                    {reportData.createdAt}
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái">
                    <Tag color={getStatusColor(reportData.status)}>
                        {getStatusText(reportData.status)}
                    </Tag>
                </Descriptions.Item>
                {reportData.approvedBy && (
                    <Descriptions.Item label="Phê duyệt bởi">
                        {reportData.approvedBy}
                    </Descriptions.Item>
                )}
                {reportData.feedback && (
                    <Descriptions.Item label="Phản hồi">
                        {reportData.feedback}
                    </Descriptions.Item>
                )}
            </Descriptions>

            <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                    Phản hồi
                </label>
                <TextArea
                    rows={4}
                    placeholder="Nhập phản hồi của bạn (không bắt buộc)"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                />
            </div>

            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button
                    type="primary"
                    danger
                    icon={<CloseOutlined />}
                    loading={loading}
                    onClick={handleReject}
                    disabled={reportData.status == 'rejected'}
                >
                    Từ chối
                </Button>
                <Button
                    type="primary"
                    icon={<CheckOutlined />}
                    loading={loading}
                    onClick={handleApprove}
                    disabled={reportData.status == 'approved'}
                >
                    Chấp nhận
                </Button>
            </Space>
        </Modal>
    );
};

export default ApprovalsModal;
