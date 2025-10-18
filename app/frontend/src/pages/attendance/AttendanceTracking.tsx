import React from 'react'
import AttendanceSummaryTable from './components/AttendanceSummaryTable'
import AttendanceDetailTable from './components/AttendanceDetailTable'

const AttendanceTracking: React.FC = () => {
    return (
        <div>
            {/* Bảng tổng quan ở trên */}
            <AttendanceSummaryTable />
            
            {/* Bảng chi tiết ở dưới */}
            <AttendanceDetailTable />
        </div>
    )
}

export default AttendanceTracking
