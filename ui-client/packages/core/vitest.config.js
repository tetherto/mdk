import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test-utils/setup-tests.ts'],

    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'build', 'coverage', '**/*.d.ts'],

    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'html', 'lcov', 'json'],
      reportOnFailure: true,
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/**/index.{ts,tsx}',
        'src/**/*.d.ts',
        'src/test-utils/**',
        'src/components/icons/**',
        'src/types/**',
        // Pure render-only components with no testable logic (like icons)
        'src/components/logs/**',
        'src/components/labeled-card/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },

    testTimeout: 10000,
    hookTimeout: 10000,

    mockReset: true,
    restoreMocks: true,
    clearMocks: true,

    reporters: ['default'],

    // CI runner has 4 vCPUs; 6 threads keeps the queue shallow for 40 test files
    maxWorkers: process.env.CI ? 6 : undefined,
    minWorkers: process.env.CI ? 2 : undefined,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@tetherto/mdk-core-ui': resolve(__dirname, './src'),
    },
  },
  define: {
    'process.env': JSON.stringify({ NODE_ENV: 'test' }),
    global: 'globalThis',
  },
})
