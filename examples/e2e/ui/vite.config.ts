import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3030,
    proxy: {
      // Forward /oauth/* and /site-monitor/* to app-node during dev.
      // In production the UI is served by app-node as static files — same origin, no proxy needed.
      '/oauth': 'http://localhost:3000',
      '/site-monitor': 'http://localhost:3000',
    },
  },
})
