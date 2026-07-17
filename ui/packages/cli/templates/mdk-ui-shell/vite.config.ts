import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The dev server defaults to port 3030 to match the backend's
// `callbackUriUI` default (http://localhost:3030). If you change this port,
// update `callbackUriUI` in miningos-gateway/config/facs/httpd-oauth2.config.json {todo: update miningos-gateway}
// accordingly — otherwise the OAuth round-trip will land at the wrong host.

const _require = createRequire(import.meta.url)
const devkitRoot = dirname(_require.resolve('@tetherto/mdk-react-devkit/package.json'))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // The devkit's component SCSS files use `@use '@primitives/styles/mixins'`.
      // In the devkit's own build that alias is resolved by its vite.config.js,
      // but when Vite processes those files through the workspace symlink in the
      // dev-server it needs the same alias here.
      '@primitives': resolve(devkitRoot, 'src/core'),
    },
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
