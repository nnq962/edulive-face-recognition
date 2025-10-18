import React from 'react'
import { Card, Row, Col, Statistic } from 'antd'

// Ant Design color presets
const colorPresets: Record<string, { bg: string; text: string }> = {
    green: { bg: '#f6ffed', text: '#52c41a' },
    volcano: { bg: '#fff2e8', text: '#fa541c' },
    orange: { bg: '#fff7e6', text: '#fa8c16' },
    geekblue: { bg: '#f0f5ff', text: '#2f54eb' },
    purple: { bg: '#f9f0ff', text: '#722ed1' },
    blue: { bg: '#e6f7ff', text: '#1890ff' },
    gray: { bg: '#fafafa', text: '#595959' },
    magenta: { bg: '#fff0f6', text: '#eb2f96' },
}

const AttendanceSummaryTable: React.FC = () => {
    // Dữ liệu mẫu
    const summaryData = {
        onTime: 18,
        late8_10: 2,
        late8_30: 1,
        earlyLeave: 3,
        morningAbsent: 1,
        afternoonAbsent: 1,
        dayOff: 2,
        fine: '80k',
        deviceStatus: 'online', // 'online' or 'offline'
        lastUpdate: '14:30:25',
    }

    return (
        <div style={{ marginBottom: 16 }}>
            <Card
                title={<span style={{ fontWeight: 600, fontSize: 16 }}>Thông tin tổng quan</span>}
                extra={
                    <a style={{ fontSize: 14 }}>
                        Máy chấm công: {summaryData.deviceStatus === 'online' ? 'đang hoạt động' : 'không hoạt động'} (cập nhật {summaryData.lastUpdate})
                    </a>
                }
                style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.08)', borderRadius: 8 }}
            >
                <Row gutter={[16, 16]}>
                    {/* Đúng giờ */}
                    <Col xs={12} sm={12} md={6} lg={6}>
                        <Card variant="borderless" style={{ backgroundColor: colorPresets.green.bg, textAlign: 'center' }}>
                            <Statistic
                                title={<span style={{ fontSize: 14 }}>Đúng giờ</span>}
                                value={summaryData.onTime}
                                valueStyle={{ color: colorPresets.green.text, fontSize: 28 }}
                            />
                        </Card>
                    </Col>

                    {/* Đi muộn sau 8:10 */}
                    <Col xs={12} sm={12} md={6} lg={6}>
                        <Card variant="borderless" style={{ backgroundColor: colorPresets.volcano.bg, textAlign: 'center' }}>
                            <Statistic
                                title={<span style={{ fontSize: 14, whiteSpace: 'nowrap' }}>Muộn sau 8:10</span>}
                                value={summaryData.late8_10}
                                valueStyle={{ color: colorPresets.volcano.text, fontSize: 28 }}
                            />
                        </Card>
                    </Col>

                    {/* Đi muộn sau 8:30 */}
                    <Col xs={12} sm={12} md={6} lg={6}>
                        <Card variant="borderless" style={{ backgroundColor: colorPresets.volcano.bg, textAlign: 'center' }}>
                            <Statistic
                                title={<span style={{ fontSize: 14, whiteSpace: 'nowrap' }}>Muộn sau 8:30</span>}
                                value={summaryData.late8_30}
                                valueStyle={{ color: colorPresets.volcano.text, fontSize: 28 }}
                            />
                        </Card>
                    </Col>

                    {/* Về sớm */}
                    <Col xs={12} sm={12} md={6} lg={6}>
                        <Card variant="borderless" style={{ backgroundColor: colorPresets.orange.bg, textAlign: 'center' }}>
                            <Statistic
                                title={<span style={{ fontSize: 14 }}>Về sớm</span>}
                                value={summaryData.earlyLeave}
                                valueStyle={{ color: colorPresets.orange.text, fontSize: 28 }}
                            />
                        </Card>
                    </Col>

                    {/* Vắng sáng */}
                    <Col xs={12} sm={12} md={6} lg={6}>
                        <Card variant="borderless" style={{ backgroundColor: colorPresets.geekblue.bg, textAlign: 'center' }}>
                            <Statistic
                                title={<span style={{ fontSize: 14 }}>Vắng sáng</span>}
                                value={summaryData.morningAbsent}
                                valueStyle={{ color: colorPresets.geekblue.text, fontSize: 28 }}
                            />
                        </Card>
                    </Col>

                    {/* Vắng chiều */}
                    <Col xs={12} sm={12} md={6} lg={6}>
                        <Card variant="borderless" style={{ backgroundColor: colorPresets.purple.bg, textAlign: 'center' }}>
                            <Statistic
                                title={<span style={{ fontSize: 14 }}>Vắng chiều</span>}
                                value={summaryData.afternoonAbsent}
                                valueStyle={{ color: colorPresets.purple.text, fontSize: 28 }}
                            />
                        </Card>
                    </Col>

                    {/* Nghỉ */}
                    <Col xs={12} sm={12} md={6} lg={6}>
                        <Card variant="borderless" style={{ backgroundColor: colorPresets.gray.bg, textAlign: 'center' }}>
                            <Statistic
                                title={<span style={{ fontSize: 14 }}>Nghỉ</span>}
                                value={summaryData.dayOff}
                                valueStyle={{ color: colorPresets.gray.text, fontSize: 28 }}
                            />
                        </Card>
                    </Col>

                    {/* Tiền phạt */}
                    <Col xs={12} sm={12} md={6} lg={6}>
                        <Card variant="borderless" style={{ backgroundColor: colorPresets.magenta.bg, textAlign: 'center' }}>
                            <Statistic
                                title={<span style={{ fontSize: 14 }}>Tiền phạt</span>}
                                value={summaryData.fine}
                                valueStyle={{ color: colorPresets.magenta.text, fontSize: 28 }}
                            />
                        </Card>
                    </Col>
                </Row>
            </Card>
        </div>
    )
}

export default AttendanceSummaryTable
