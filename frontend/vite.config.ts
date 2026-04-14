// frontend/vite.config.ts
// Dev mode: VITE_API_URL is empty, Vite proxy forwards /api → backend container.
// Prod mode: VITE_API_URL is empty, Nginx proxy forwards /api → backend container.
// In both cases frontend uses relative /api paths — no hardcoded hosts.

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: {
      usePolling: true,     // ← būtina Windows/WSL2
      interval: 1000,
    },
    proxy: {
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true,
      },
    },
  },
})