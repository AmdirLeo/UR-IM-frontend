import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      usePolling: true, // 开启轮询监听
      interval: 1000,   // 每秒检查一次文件变动（视情况可调）
    }
  }
})
