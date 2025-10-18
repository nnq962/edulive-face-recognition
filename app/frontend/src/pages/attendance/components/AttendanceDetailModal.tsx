import React from 'react'
import { Modal } from 'antd'

interface AttendanceDetailModalProps {
    open: boolean
    onClose: () => void
    date?: string
}

const AttendanceDetailModal: React.FC<AttendanceDetailModalProps> = ({ open, onClose, date }) => {
    return (
        <Modal
            title={`Chi tiết chấm công - ${date || ''}`}
            open={open}
            onCancel={onClose}
            footer={null}
            width={800}
        >
            {/* Nội dung modal sẽ được thêm sau */}
            <div style={{ padding: '20px 0' }}>
                <p>Nội dung chi tiết cho ngày: {date}</p>
            </div>
        </Modal>
    )
}

export default AttendanceDetailModal
