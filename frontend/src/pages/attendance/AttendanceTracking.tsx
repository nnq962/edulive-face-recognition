import React from 'react'
import AttendanceDetailTable from './components/AttendanceDetailTable'
import AttendanceReport from './components/AttendanceReport'

const AttendanceTracking: React.FC = () => {
    return (
        <div>            
            {/* Bảng chi tiết ở dưới */}
            <AttendanceDetailTable />

            {/* Bảng báo cáo ở dưới */}
            {/* <AttendanceReport /> */}
        </div>
    )
}

export default AttendanceTracking
