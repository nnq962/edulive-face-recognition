import React, { useState } from 'react';
import { Card, Button, Space, Tag, Badge, Modal, message, Row, Col, Input, Select, DatePicker, TimePicker, Form, Divider, Alert } from 'antd';
import { CheckOutlined, CrownOutlined, FireOutlined, ThunderboltOutlined, SearchOutlined, EditOutlined, ClockCircleOutlined } from '@ant-design/icons';

interface PricingPlan {
    id: string;
    name: string;
    price: string;
    originalPrice?: string;
    requests: number | string;
    description: string;
    features: string[];
    color: string;
    icon: React.ReactNode;
    popular?: boolean;
    badge?: string;
}

const Vip: React.FC = () => {
    const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [trialForm] = Form.useForm();
    const [searchResult, setSearchResult] = useState<any>(null);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editForm] = Form.useForm();

    const plans: PricingPlan[] = [
        {
            id: 'pro',
            name: 'Pro',
            price: '99.000đ',
            originalPrice: '199.000đ',
            requests: 100,
            description: 'Cho người thỉnh thoảng đi muộn',
            features: [
                '100 request điều chỉnh chấm công',
                'Hỗ trợ email',
                'Báo cáo hàng tháng',
                'Lưu trữ 90 ngày',
                'X:Tư vấn cá nhân hóa',
                'X:Ưu tiên tính năng mới',
            ],
            color: '#1890ff',
            icon: <ThunderboltOutlined />,
        },
        {
            id: 'premium',
            name: 'Premium',
            price: '299.000đ',
            originalPrice: '599.000đ',
            requests: 400,
            description: 'Cho người hay đi muộn',
            features: [
                '400 request điều chỉnh chấm công',
                'Hỗ trợ ưu tiên 24/7',
                'Báo cáo chi tiết hàng tuần',
                'Lưu trữ 365 ngày',
                'Tư vấn cá nhân hóa',
                'X:Ưu tiên tính năng mới',
            ],
            color: '#722ed1',
            icon: <CrownOutlined />,
            popular: true,
            badge: 'Tiết kiệm 25%',
        },
        {
            id: 'lifetime',
            name: 'Lifetime',
            price: '1.999.000đ',
            originalPrice: '2.999.000đ',
            requests: '∞',
            description: 'Cho ai muốn tự do tuyệt đối',
            features: [
                'Request không giới hạn',
                'VIP support 24/7',
                'Báo cáo real-time',
                'Lưu trữ vĩnh viễn',
                'Tư vấn chuyên gia',
                'Ưu tiên tính năng mới',
            ],
            color: '#fa8c16',
            icon: <FireOutlined />,
            badge: 'Best Value',
        },
    ];

    const handleSelectPlan = (plan: PricingPlan) => {
        setSelectedPlan(plan);
        setModalOpen(true);
    };

    const handlePurchase = () => {
        message.success(`Successfully purchased ${selectedPlan?.name}`);
        setModalOpen(false);
        setSelectedPlan(null);
    };

    // Mock departments and employees
    const departments = ['Tầng 1', 'Tầng 2', 'Tầng 3'];
    const employees = [
        { name: 'Nguyễn Văn A', department: 'Tầng 1' },
        { name: 'Trần Thị B', department: 'Tầng 2' },
        { name: 'Lê Văn C', department: 'Tầng 2' },
    ];

    const handleSearchRecord = async () => {
        try {
            const values = await trialForm.validateFields();
            // Simulate API call
            setTimeout(() => {
                // Mock result - 50% có bản ghi, 50% không có
                const hasRecord = Math.random() > 0.5;
                if (hasRecord) {
                    setSearchResult({
                        found: true,
                        employee: values.employee,
                        department: values.department,
                        date: values.date?.format('YYYY-MM-DD'),
                        checkIn: '08:30',
                        checkOut: '17:45',
                    });
                    message.success(`Successfully found record`);
                } else {
                    setSearchResult({
                        found: false,
                        employee: values.employee,
                        department: values.department,
                        date: values.date?.format('YYYY-MM-DD'),
                    });
                    message.info('No record found');
                }
            }, 500);
        } catch (error) {
            console.error('Validation failed:', error);
        }
    };

    const handleOpenEditModal = () => {
        if (searchResult?.found) {
            editForm.setFieldsValue({
                checkIn: searchResult.checkIn,
                checkOut: searchResult.checkOut,
            });
        } else {
            editForm.resetFields();
        }
        setEditModalOpen(true);
    };

    const handleSubmitEdit = async () => {
        try {
            const values = await editForm.validateFields();
            // Simulate API call
            setTimeout(() => {
                message.success(searchResult?.found ? 'Update record successful' : 'Create record successful');
                setEditModalOpen(false);
                editForm.resetFields();
                // Update search result
                if (searchResult) {
                    setSearchResult({
                        ...searchResult,
                        found: true,
                        checkIn: values.checkIn,
                        checkOut: values.checkOut,
                    });
                }
            }, 500);
        } catch (error) {
            console.error('Validation failed:', error);
        }
    };

    return (
        <>
            <div style={{
                width: '100vw',
                height: '100vh',
                padding: '40px 24px',
                overflow: 'auto',
                position: 'fixed',
                top: 0,
                left: 0,
            }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <h1 style={{
                        fontSize: '42px',
                        fontWeight: 700,
                        marginBottom: '16px',
                        textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        textTransform: 'uppercase',
                    }}>
                        Chọn gói phù hợp với bạn ngay hôm nay
                    </h1>
                    <p style={{
                        fontSize: '18px',
                        margin: '0 auto',
                    }}>
                        Đừng để đời chỉ là những chuỗi ngày được chấm công. Chọn gói phù hợp để tự do điều chỉnh chấm công! 😉
                    </p>
                </div>

                {/* Pricing Cards */}
                <Row gutter={[24, 24]}
                    style={{ maxWidth: '1400px', margin: '0 auto' }}>
                    {plans.map((plan) => (
                        <Col xs={24} sm={24} md={8} key={plan.id}>
                            <Badge.Ribbon
                                text={plan.badge}
                                color={plan.color}
                                style={{ display: plan.badge ? 'flex' : 'none' }}
                            >
                                <Card
                                    hoverable
                                    style={{
                                        border: `3px solid ${plan.color}`,
                                        boxShadow: plan.popular
                                            ? '0 20px 60px rgba(0,0,0,0.3)'
                                            : '0 4px 20px rgba(0,0,0,0.15)',
                                        transition: 'all 0.3s ease',
                                        height: '100%',
                                    }}
                                    styles={{
                                        body: {
                                            padding: '32px 24px',
                                        },
                                    }}
                                >
                                    {/* Icon & Name */}
                                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                                        <div style={{
                                            fontSize: '48px',
                                            color: plan.color,
                                            marginBottom: '12px',
                                        }}>
                                            {plan.icon}
                                        </div>
                                        <h2 style={{
                                            fontSize: '28px',
                                            fontWeight: 700,
                                            color: plan.color,
                                            margin: 0,
                                        }}>
                                            {plan.name}
                                        </h2>
                                        <p style={{
                                            color: '#666',
                                            fontSize: '14px',
                                            marginTop: '8px',
                                        }}>
                                            {plan.description}
                                        </p>
                                    </div>

                                    {/* Price */}
                                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                                        {plan.originalPrice && (
                                            <div style={{
                                                textDecoration: 'line-through',
                                                color: '#999',
                                                fontSize: '16px',
                                                marginBottom: '4px',
                                            }}>
                                                {plan.originalPrice}
                                            </div>
                                        )}
                                        <div style={{
                                            fontSize: '42px',
                                            fontWeight: 700,
                                            color: '#000',
                                        }}>
                                            {plan.price}
                                        </div>
                                        <Tag
                                            color={plan.color}
                                            style={{
                                                marginTop: '12px',
                                                fontSize: '16px',
                                                padding: '4px 16px',
                                                borderRadius: '9999px',
                                            }}
                                        >
                                            {typeof plan.requests === 'number'
                                                ? `${plan.requests} requests`
                                                : 'Unlimited requests'}
                                        </Tag>
                                    </div>

                                    {/* Features */}
                                    <Space direction="vertical" style={{ width: '100%', marginBottom: '24px' }} size={12}>
                                        {plan.features.map((feature, index) => {
                                            const isDisabled = feature.startsWith('X:');
                                            const featureText = isDisabled ? feature.substring(2) : feature;

                                            return (
                                                <div key={index} style={{ display: 'flex', alignItems: 'flex-start' }}>
                                                    <CheckOutlined style={{
                                                        color: isDisabled ? '#d9d9d9' : plan.color,
                                                        fontSize: '16px',
                                                        marginRight: '12px',
                                                        marginTop: '2px',
                                                    }} />
                                                    <span style={{
                                                        color: isDisabled ? '#d9d9d9' : '#333',
                                                        fontSize: '15px',
                                                        textDecoration: isDisabled ? 'line-through' : 'none',
                                                    }}>
                                                        {featureText}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </Space>

                                    {/* Button */}
                                    <Button
                                        type={plan.popular ? 'primary' : 'default'}
                                        size="large"
                                        block
                                        onClick={() => handleSelectPlan(plan)}
                                        style={{
                                            height: '50px',
                                            fontSize: '16px',
                                            fontWeight: 600,
                                            backgroundColor: plan.popular ? plan.color : undefined,
                                            borderColor: plan.color,
                                            color: plan.popular ? 'white' : plan.color,
                                        }}
                                    >
                                        Chọn gói {plan.name}
                                    </Button>
                                </Card>
                            </Badge.Ribbon>
                        </Col>
                    ))}
                </Row>

                {/* Trial Section */}
                <div style={{
                    padding: '48px 0',
                    maxWidth: '1400px',
                    margin: '0 auto',
                }}>
                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                        <h2 style={{
                            fontSize: '32px',
                            fontWeight: 700,
                            marginBottom: '16px',
                        }}>
                            Dùng thử miễn phí
                        </h2>
                        <p style={{
                            fontSize: '18px'
                        }}>
                            Trải nghiệm tính năng điều chỉnh chấm công ngay bây giờ!
                        </p>
                    </div>

                    <Card
                        style={{
                            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                            borderRadius: '8px',
                        }}
                    >
                        {/* Search Form */}
                        <div style={{ marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>
                                <SearchOutlined style={{ marginRight: '8px' }} />
                                Tìm kiếm bản ghi
                            </h3>
                            <Form
                                form={trialForm}
                                layout="vertical"
                            >
                                <Row gutter={16}>
                                    <Col xs={24} sm={8}>
                                        <Form.Item
                                            name="employee"
                                            label="Tên nhân viên"
                                            rules={[{ required: true, message: 'Vui lòng chọn nhân viên!' }]}
                                        >
                                            <Select
                                                placeholder="Chọn nhân viên"
                                                showSearch
                                                filterOption={(input, option) =>
                                                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                                }
                                                options={employees.map(emp => ({
                                                    label: emp.name,
                                                    value: emp.name,
                                                }))}
                                            />
                                        </Form.Item>
                                    </Col>

                                    <Col xs={24} sm={8}>
                                        <Form.Item
                                            name="department"
                                            label="Phòng ban"
                                            rules={[{ required: true, message: 'Vui lòng chọn phòng ban!' }]}
                                        >
                                            <Select
                                                placeholder="Chọn phòng ban"
                                                options={departments.map(dept => ({
                                                    label: dept,
                                                    value: dept,
                                                }))}
                                            />
                                        </Form.Item>
                                    </Col>

                                    <Col xs={24} sm={8}>
                                        <Form.Item
                                            name="date"
                                            label="Ngày"
                                            rules={[{ required: true, message: 'Vui lòng chọn ngày!' }]}
                                        >
                                            <DatePicker
                                                style={{ width: '100%' }}
                                                format="YYYY-MM-DD"
                                                placeholder="Chọn ngày"
                                                allowClear={true}
                                            />
                                        </Form.Item>
                                    </Col>
                                </Row>

                                <Button
                                    type="primary"
                                    icon={<SearchOutlined />}
                                    onClick={handleSearchRecord}
                                    size="large"
                                    style={{ width: '200px' }}
                                >
                                    Tìm kiếm bản ghi
                                </Button>
                            </Form>
                        </div>

                        <Divider />

                        {/* Search Result */}
                        <div>
                            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>
                                <ClockCircleOutlined style={{ marginRight: '8px' }} />
                                Kết quả tìm kiếm
                            </h3>

                            {!searchResult ? (
                                <Alert
                                    message="Chưa có kết quả"
                                    description="Vui lòng điền thông tin và nhấn 'Tìm kiếm bản ghi' để xem kết quả."
                                    type="info"
                                    showIcon
                                />
                            ) : (
                                <>
                                    <Card
                                        size="small"
                                        style={{
                                            marginBottom: '16px',
                                            background: searchResult.found ? '#f6ffed' : '#fff7e6',
                                            border: searchResult.found ? '1px solid #b7eb8f' : '1px solid #ffd591',
                                        }}
                                    >
                                        <Space direction="vertical" style={{ width: '100%' }} size={8}>
                                            <div>
                                                <strong>Trạng thái:</strong>{' '}
                                                <Tag color={searchResult.found ? 'success' : 'warning'}>
                                                    {searchResult.found ? 'Tìm thấy bản ghi' : 'Không tìm thấy bản ghi'}
                                                </Tag>
                                            </div>
                                            <div><strong>Nhân viên:</strong> {searchResult.employee}</div>
                                            <div><strong>Phòng ban:</strong> {searchResult.department}</div>
                                            <div><strong>Ngày:</strong> {searchResult.date}</div>
                                            {searchResult.found && (
                                                <>
                                                    <Divider style={{ margin: '8px 0' }} />
                                                    <div><strong>Check in:</strong> {searchResult.checkIn}</div>
                                                    <div><strong>Check out:</strong> {searchResult.checkOut}</div>
                                                </>
                                            )}
                                        </Space>
                                    </Card>

                                    <Button
                                        type="primary"
                                        icon={<EditOutlined />}
                                        onClick={handleOpenEditModal}
                                        size="large"
                                        style={{
                                            background: searchResult.found ? '#52c41a' : '#faad14',
                                            borderColor: searchResult.found ? '#52c41a' : '#faad14',
                                            width: '200px',
                                        }}
                                    >
                                        {searchResult.found ? 'Cập nhật bản ghi' : 'Tạo bản ghi mới'}
                                    </Button>
                                </>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Confirmation Modal */}
                <Modal
                    title={`Xác nhận mua gói ${selectedPlan?.name}`}
                    open={modalOpen}
                    onOk={handlePurchase}
                    onCancel={() => setModalOpen(false)}
                    okText="Xác nhận thanh toán"
                    cancelText="Hủy"
                    closable={false}
                    centered
                    width={{
                        xs: '90%',
                        sm: '80%',
                        md: '500px',
                    }}
                >
                    {selectedPlan && (
                        <div style={{ padding: '16px 0' }}>
                            <div style={{
                                background: '#f5f5f5',
                                padding: '16px',
                                marginBottom: '16px',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ fontWeight: 500 }}>Gói:</span>
                                    <span style={{ color: selectedPlan.color, fontWeight: 700 }}>{selectedPlan.name}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ fontWeight: 500 }}>Số lượng yêu cầu:</span>
                                    <span style={{ fontWeight: 700 }}>
                                        {typeof selectedPlan.requests === 'number'
                                            ? `${selectedPlan.requests} requests`
                                            : 'Không giới hạn'}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontWeight: 500 }}>Giá:</span>
                                    <span style={{ fontSize: '20px', fontWeight: 700, color: selectedPlan.color }}>
                                        {selectedPlan.price}
                                    </span>
                                </div>
                            </div>

                            <p style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>
                                Bằng việc xác nhận, bạn đồng ý với điều khoản sử dụng và chính sách thanh toán của chúng tôi.
                            </p>
                        </div>
                    )}
                </Modal>

                {/* Edit/Create Modal */}
                <Modal
                    title={searchResult?.found ? 'Cập nhật bản ghi chấm công' : 'Tạo bản ghi chấm công mới'}
                    open={editModalOpen}
                    onOk={handleSubmitEdit}
                    onCancel={() => setEditModalOpen(false)}
                    okText="Gửi"
                    cancelText="Hủy"
                    centered
                    width={{
                        xs: '90%',
                        sm: '80%',
                        md: '500px',
                    }}
                >
                    <Form
                        form={editForm}
                        layout="vertical"
                        style={{ marginTop: '16px' }}
                    >
                        <Form.Item
                            name="checkIn"
                            label="Giờ check in"
                            rules={[{ required: true, message: 'Vui lòng nhập giờ check in!' }]}
                        >
                            <TimePicker
                                style={{ width: '100%' }}
                                placeholder="Chọn giờ"
                            />
                        </Form.Item>

                        <Form.Item
                            name="checkOut"
                            label="Giờ check out"
                            rules={[{ required: true, message: 'Vui lòng nhập giờ check out!' }]}
                        >
                            <TimePicker
                                style={{ width: '100%' }}
                                placeholder="Chọn giờ"
                            />                        </Form.Item>

                        <Form.Item
                            name="key"
                            label="Key xác thực"
                            rules={[
                                { required: true, message: 'Vui lòng nhập key!' },
                                { len: 20, message: 'Key phải có đúng 20 ký tự!' }
                            ]}
                        >
                            <Input.Password
                                placeholder="Nhập key 20 ký tự"
                                maxLength={20}
                            />
                        </Form.Item>

                        <Alert
                            message="Mỗi lần sử dụng sẽ tiêu tốn 1 request"
                            type="info"
                            showIcon
                        />
                    </Form>
                </Modal>
            </div>

            {/* CSS để khóa scroll toàn cục */}
            <style>{`
                body {
                    overflow: hidden !important;
                }
            `}</style>
        </>
    );
};

export default Vip;
