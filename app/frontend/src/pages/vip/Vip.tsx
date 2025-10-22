import React, { useState } from 'react';
import { Card, Button, Space, Tag, Badge, Modal, message, Row, Col } from 'antd';
import { CheckOutlined, CrownOutlined, FireOutlined, ThunderboltOutlined } from '@ant-design/icons';

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

    const plans: PricingPlan[] = [
        {
            id: 'pro',
            name: 'Pro',
            price: '99,000đ',
            originalPrice: '199,000đ',
            requests: 100,
            description: 'Cho người thỉnh thoảng đi muộn',
            features: [
                '100 request điều chỉnh chấm công',
                'Hỗ trợ email',
                'Báo cáo hàng tháng',
                'Lưu trữ 30 ngày',
                'X:Tư vấn cá nhân hóa',
                'X:Ưu tiên tính năng mới',
            ],
            color: '#1890ff',
            icon: <ThunderboltOutlined />,
        },
        {
            id: 'premium',
            name: 'Premium',
            price: '299,000đ',
            originalPrice: '599,000đ',
            requests: 400,
            description: 'Cho người hay đi muộn',
            features: [
                '400 request điều chỉnh chấm công',
                'Hỗ trợ ưu tiên 24/7',
                'Báo cáo chi tiết hàng tuần',
                'Lưu trữ 90 ngày',
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
            price: '999,000đ',
            originalPrice: '1,999,000đ',
            requests: '∞',
            description: 'Cho ai muốn tự do tuyệt đối',
            features: [
                'request không giới hạn',
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
        message.success(`Đã mua gói ${selectedPlan?.name} thành công!`);
        setModalOpen(false);
        setSelectedPlan(null);
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
                <Card
                    style={{
                        maxWidth: '700px',
                        boxShadow: 'none',
                        marginBottom: '48px',
                    }}>
                    <p>Card content</p>
                    <p>Card content</p>
                    <p>Card content</p>
                </Card>
                <div style={{ textAlign: 'center', marginBottom: '48px' }}>
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
                        Đừng để việc đi muộn làm ảnh hưởng đến công việc. Chọn gói phù hợp để tự do điều chỉnh chấm công! 😉
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
