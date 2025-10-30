// src/api/exportdataApi.ts

import axiosClient from './axiosClient'

// Interface cho params của API monthly-report
interface MonthlyAttendanceReportParams {
    month: string              // Required: Tháng cần lấy (format: YYYY-MM, ví dụ: "2025-10")
    page?: number             // Optional: Trang hiện tại (default: 1)
    limit?: number            // Optional: Số items mỗi trang (default: 100, max: 100)
    user_id?: string          // Optional: Lọc theo user_id cụ thể
    date?: string             // Optional: Lọc theo ngày cụ thể (format: YYYY-MM-DD)
    department?: string       // Optional: Lọc theo tên phòng ban (ví dụ: "Tầng 1")
}

// Interface cho params của API export (không có page, limit)
interface ExportMonthlyReportParams {
    month: string              // Required: Tháng cần lấy (format: YYYY-MM, ví dụ: "2025-10")
    user_id?: string          // Optional: Lọc theo user_id cụ thể
    date?: string             // Optional: Lọc theo ngày cụ thể (format: YYYY-MM-DD)
    department?: string       // Optional: Lọc theo tên phòng ban (ví dụ: "Tầng 1")
}

const exportdataApi = {
    /**
     * Lấy báo cáo chấm công theo tháng với các filter
     * 
     * @param params - Tham số cho API
     * @param params.month - Tháng cần lấy báo cáo (format: YYYY-MM)
     * @param params.page - Trang hiện tại (default: 1)
     * @param params.limit - Số items mỗi trang (default: 100, max: 100)
     * @param params.user_id - Lọc theo user_id cụ thể
     * @param params.date - Lọc theo ngày cụ thể (format: YYYY-MM-DD)
     * @param params.department - Lọc theo tên phòng ban
     * 
     * @returns Promise với data từ API
     * 
     * @example
     * // Lấy tất cả users trong tháng 10/2025
     * getMonthlyAttendanceReport({ month: '2025-10', limit: 100 })
     * 
     * // Lọc theo user cụ thể
     * getMonthlyAttendanceReport({ month: '2025-10', user_id: 'xxx' })
     * 
     * // Lọc theo ngày cụ thể
     * getMonthlyAttendanceReport({ month: '2025-10', date: '2025-10-15' })
     * 
     * // Lọc theo phòng ban
     * getMonthlyAttendanceReport({ month: '2025-10', department: 'Tầng 1' })
     * 
     * // Kết hợp nhiều filters
     * getMonthlyAttendanceReport({ 
     *   month: '2025-10', 
     *   department: 'Tầng 1',
     *   date: '2025-10-15',
     *   limit: 50
     * })
     */
    getMonthlyAttendanceReport: async (params: MonthlyAttendanceReportParams) => {
        const { 
            month, 
            page = 1, 
            limit = 100,
            user_id,
            date,
            department
        } = params

        // Build params object, chỉ thêm các field có giá trị
        const queryParams: any = {
            month,
            page,
            limit
        }

        // Chỉ thêm optional params nếu có giá trị
        if (user_id) queryParams.user_id = user_id
        if (date) queryParams.date = date
        if (department) queryParams.department = department

        const response = await axiosClient.get('/attendances/monthly-report', {
            params: queryParams
        })
        
        return response.data
    },

    /**
     * Xuất báo cáo chấm công theo tháng ra file Excel
     * 
     * @param params - Tham số cho API (KHÔNG có page, limit)
     * @param params.month - Tháng cần lấy báo cáo (format: YYYY-MM)
     * @param params.user_id - Lọc theo user_id cụ thể
     * @param params.date - Lọc theo ngày cụ thể (format: YYYY-MM-DD)
     * @param params.department - Lọc theo tên phòng ban
     * 
     * @returns Promise - File sẽ tự động download
     * 
     * @example
     * // Xuất tất cả users trong tháng
     * exportMonthlyReportToExcel({ month: '2025-10' })
     * 
     * // Xuất theo phòng ban
     * exportMonthlyReportToExcel({ month: '2025-10', department: 'Tầng 1' })
     * 
     * // Xuất 1 user cụ thể
     * exportMonthlyReportToExcel({ month: '2025-10', user_id: 'xxx' })
     * 
     * // Xuất 1 ngày cụ thể
     * exportMonthlyReportToExcel({ month: '2025-10', date: '2025-10-15' })
     */
    exportMonthlyReportToExcel: async (params: ExportMonthlyReportParams) => {
        const { 
            month, 
            user_id,
            date,
            department
        } = params

        // Build params object, chỉ thêm các field có giá trị
        const queryParams: any = {
            month
        }

        // Chỉ thêm optional params nếu có giá trị
        if (user_id) queryParams.user_id = user_id
        if (date) queryParams.date = date
        if (department) queryParams.department = department

        const response = await axiosClient.get('/attendances/monthly-report/export', {
            params: queryParams,
            responseType: 'blob' // Quan trọng: nhận file binary
        })
        
        // Tạo download link
        const url = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')
        link.href = url
        
        // Tạo filename từ params
        let filename = `attendance_report_${month}`
        if (department) filename += `_${department}`
        if (date) filename += `_${date}`
        if (user_id) filename += `_${user_id.substring(0, 8)}`
        filename += '.xlsx'
        
        link.setAttribute('download', filename)
        document.body.appendChild(link)
        link.click()
        link.remove()
        
        // Clean up blob URL
        window.URL.revokeObjectURL(url)
    }
}

export default exportdataApi
