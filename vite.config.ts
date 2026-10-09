import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',      // Listen on all interfaces (LAN accessible)
    port: 5173,
    strictPort: true,
    proxy: {
      // Any request to /api/* is forwarded to the JARVIS backend
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      // /health and /console also proxied for convenience
      '/health': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
