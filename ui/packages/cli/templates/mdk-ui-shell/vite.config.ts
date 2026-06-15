import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The dev server defaults to port 3030 to match the backend's
// `callbackUriUI` default (http://localhost:3030). If you change this port,
// update `callbackUriUI` in miningos-app-node/config/facs/httpd-oauth2.config.json
// accordingly — otherwise the OAuth round-trip will land at the wrong host.

export default defineConfig({
  plugins: [react()],
  resolve: {
    // When MDK packages are linked via `file:` (e.g. into a monorepo checkout)
    // they resolve React from their own node_modules, while the app resolves
    // it from its own — two physical copies of the same React, triggering
    // "Invalid hook call". `dedupe` forces a single instance.
    dedupe: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
  },
  server: {
    port: 3030,
    proxy: {
      '/auth': 'http://localhost:3000',
      '/oauth': 'http://localhost:3000',
      '/api': 'http://localhost:3000',
      '/pub': 'http://localhost:3000',
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },
})
