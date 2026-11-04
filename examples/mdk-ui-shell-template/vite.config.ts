import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

import { mdkInstalledApps } from './vite/mdk-installed-apps'
import { mdkSharedModules } from './vite/mdk-shared-modules'

// The dev server defaults to port 3030, the host your identity plugin is
// expected to redirect back to with `?authToken=` (http://localhost:3030).
// If you change this port, change that redirect to match — otherwise the
// OAuth round-trip will land at the wrong host.

const _require = createRequire(import.meta.url)
const devkitRoot = dirname(_require.resolve('@tetherto/mdk-react-devkit/package.json'))
// This app root, plus the directory holding the MDK packages. When the MDK
// deps are `file:`-linked (running this template in place, or a copy scaffolded
// into the monorepo's apps/) they resolve to `…/ui/packages/*`, outside this
// app — so Vite's dev server must be allowed to serve their built assets. For a standalone app
// the packages live under the app's own node_modules and this is a harmless no-op.
const appRoot = dirname(fileURLToPath(import.meta.url))
const mdkPackagesRoot = dirname(devkitRoot)

export default defineConfig(({ mode }) => {
  // Where the dev server proxies /auth, /oauth, /api, /pub, /site. Defaults to the
  // mvp-site gateway (:3000); `mdk create dashboard` sets VITE_GATEWAY_URL from
  // the stack's mdk.yaml gateway port so the UI hits the right backend.
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const gatewayUrl = env.VITE_GATEWAY_URL || 'http://localhost:3000'
  // Which interface the dev server binds. Vite binds loopback by default, and
  // `mdk run dashboard` passes no arguments, so a stack running in a VM,
  // container or remote box served a dashboard nothing outside could reach.
  // Set VITE_DEV_HOST (`0.0.0.0`, or one address) to publish it; unset keeps
  // the safe default of loopback only.
  const devHost = env.VITE_DEV_HOST || false

  return {
  // mdkSharedModules lends this shell's React and MDK packages to the installed
  // apps' UIs it loads at runtime — see ./vite/mdk-shared-modules.ts.
  // mdkInstalledApps serves those UIs and lists the apps (from the mdk.yaml
  // `mdk run dashboard` reads), so no Gateway is needed to find them — see
  // ./vite/mdk-installed-apps.ts.
  plugins: [react(), mdkSharedModules(), mdkInstalledApps()],
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
    dedupe: ['react', 'react-dom', 'react-router', '@tanstack/react-query'],
  },
  server: {
    fs: {
      allow: [appRoot, mdkPackagesRoot],
    },
    host: devHost,
    port: 3030,
    proxy: {
      '/auth': gatewayUrl,
      '/oauth': gatewayUrl,
      '/api': gatewayUrl,
      '/pub': gatewayUrl,
      // The mvp-site `site` plugin's routes (/site/overview, /site/history, …),
      // so a page can read the demo stack's data with no extra config.
      '/site': gatewayUrl,
      // The co-pilot's SSE stream. The Gateway sends no CORS headers and its
      // stream route hijacks the reply, so a CORS hook could not decorate it
      // even if one existed — the panel has to reach the backend same-origin.
      '/agent': gatewayUrl,
      // Installed apps' own routes, which the Gateway forwards to each app.
      // Their UIs are served by this dev server instead, under /app-ui/.
      '/apps': gatewayUrl,
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },
  }
})
