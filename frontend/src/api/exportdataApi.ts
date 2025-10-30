// src/api/exportdataApi.ts

import axiosClient from './axiosClient'

const exportdataApi = {
    getMonthlyAttendanceReport: async ({ month, page = 1, limit = 100 }: { month: string; page?: number; limit?: number }) => {
        const response = await axiosClient.get('/attendances/monthly-report', {
            params: { month, page, limit }
        })
        return response.data
    }
}

export default exportdataApi;