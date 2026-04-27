import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf-8'))

const readGit = (args: string): string => {
  try {
    return execSync(`git ${args}`, { cwd: __dirname }).toString().trim()
  } catch {
    return 'unknown'
  }
}

const buildInfo = {
  version: pkg.version as string,
  branch: process.env.GIT_BRANCH ?? readGit('rev-parse --abbrev-ref HEAD'),
  commit: process.env.GIT_COMMIT ?? readGit('rev-parse --short HEAD'),
  commitDate: process.env.GIT_COMMIT_DATE ?? readGit('log -1 --format=%cI'),
  buildDate: new Date().toISOString(),
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_INFO__: JSON.stringify(buildInfo),
  },
  base: process.env.VITE_BASE_PATH ?? '/mdk',
  publicDir: 'public',
  plugins: [react()],
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
        additionalData: `@use '@mdk/core/styles' as *;\n`,
      } as Record<string, unknown>,
    },
  },
  build: {
    modulePreload: {
      polyfill: false,
      resolveDependencies: (_url, deps) => {
        return deps.filter((dep) => {
          return (
            !dep.includes('charts-') && !dep.includes('vendor-') && !dep.includes('page-dialog')
          )
        })
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Split heavy chart libraries (keep these separate to avoid circular deps with vendor)
            if (id.includes('react-gauge-chart')) {
              return 'vendor-gauge-chart'
            }
            if (id.includes('react-day-picker') || id.includes('date-fns')) {
              return 'vendor-date-picker'
            }
            // Recharts/d3 go into vendor to avoid circular chunk: vendor <-> vendor-charts
            // Core React libraries
            if (id.includes('react-dom')) {
              return 'vendor-react-dom'
            }
            if (id.includes('react-router')) {
              return 'vendor-react-router'
            }
            if (id.includes('react/') || id.includes('react\\') || id.endsWith('react')) {
              return 'vendor-react'
            }
            // Radix UI components
            if (id.includes('@radix-ui')) {
              return 'vendor-radix-ui'
            }
            // All other node_modules (including recharts, d3-, chart.js, lightweight-charts)
            return 'vendor'
          }
          // Split pages into separate chunks for better code splitting
          if (id.includes('src/pages/')) {
            const pageName = id.split('src/pages/')[1]?.split('.')[0]
            // Barrel index only re-exports; skip to avoid empty "page-index" chunk
            if (pageName === 'index') return undefined
            return `page-${pageName}`
          }
          if (id.includes('src/examples/')) {
            const exampleName = id.split('src/examples/')[1]?.split('.')[0]
            return `example-${exampleName}`
          }
          return undefined
        },
      },
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        unknownGlobalSideEffects: false,
      },
    },
    cssCodeSplit: true,
    cssMinify: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        passes: 2,
        pure_getters: true,
        unsafe: true,
        unsafe_comps: true,
        unsafe_math: true,
        unsafe_proto: true,
        dead_code: true,
        unused: true,
      },
      mangle: {
        safari10: true,
      },
      format: {
        comments: false,
      },
    },
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
  },
})
