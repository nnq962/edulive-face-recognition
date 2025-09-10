import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,        // cho phép truy cập bằng IP
    port: 5173,        // có thể đổi port nếu muốn
  },
})