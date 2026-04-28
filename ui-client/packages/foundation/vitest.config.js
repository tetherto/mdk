import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

const alias = {
  '@': resolve(__dirname, './src'),
  '@tetherto/mdk-core-ui': resolve(__dirname, '../core/src'),
  '@tetherto/mdk-foundation-ui': resolve(__dirname, './src'),
}

const define = {
  'process.env': JSON.stringify({ NODE_ENV: 'test' }),
  global: 'globalThis',
}

/** Settings shared across both project environments. */
const sharedTestConfig = {
  globals: true,
  setupFiles: ['./src/test-utils/setup-tests.ts'],
  mockReset: true,
  restoreMocks: true,
  clearMocks: true,
  reporters: ['default'],
  testTimeout: 10000,
  hookTimeout: 10000,
}

/**
 * Pure-logic test globs that have no DOM dependency.
 * These run in the lightweight Node.js environment instead of happy-dom,
 * cutting per-file environment spin-up cost significantly.
 */
const NODE_TEST_GLOBS = [
  'src/utils/specs/**/*.test.ts',
  'src/constants/specs/**/*.test.ts',
  'src/state/**/*.test.ts',
  'src/specs/**/*.test.ts',
  'src/**/*-utils.test.ts',
  'src/**/*.utils.test.ts',
  'src/**/*.const.test.ts',
  'src/**/*.constants.test.ts',
  'src/**/*.adapters.test.ts',
  'src/**/*.mappers.test.ts',
  'src/**/helper.test.ts',
  'src/**/column-constants.test.ts',
]

export default defineConfig({
  plugins: [react()],
  resolve: { alias },
  define,

  test: {
    /**
     * Coverage lives at root so it is collected across both projects
     * and merged into a single report.
     */
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'html', 'lcov', 'json'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/**/*.stories.{ts,tsx}',
        'src/**/index.{ts,tsx}',
        'src/test/**',
        'src/test-utils/**',
        'src/**/*.d.ts',
        'src/**/icons/**',
      ],
      thresholds: {
        lines: 90,
        functions: 80,
        branches: 80,
        statements: 90,
      },
    },

    /**
     * Split into two isolated worker pools:
     *   • node  — fast pure-logic tests, no DOM overhead
     *   • dom   — component tests that need happy-dom
     *
     * Replaces the deprecated `environmentMatchGlobs` option.
     */
    projects: [
      {
        plugins: [react()],
        resolve: { alias },
        define,
        test: {
          ...sharedTestConfig,
          name: 'node',
          environment: 'node',
          include: NODE_TEST_GLOBS,
          // Node env is cheap — 4 workers drain ~70 files quickly
          maxWorkers: process.env.CI ? 4 : undefined,
          minWorkers: process.env.CI ? 2 : undefined,
          // Vitest 4 requires unique groupOrder when projects have different maxWorkers
          sequence: { groupOrder: 1 },
        },
      },
      {
        plugins: [react()],
        resolve: { alias },
        define,
        test: {
          ...sharedTestConfig,
          name: 'dom',
          environment: 'happy-dom',
          include: ['src/**/*.{test,spec}.{ts,tsx}'],
          exclude: [
            'node_modules',
            'dist',
            'build',
            '.next',
            'coverage',
            '**/*.d.ts',
            // exclude all node globs so there is no overlap
            ...NODE_TEST_GLOBS,
          ],
          // happy-dom env is heavier; 6 workers balances throughput vs memory
          // on the 4-vCPU CI runner (threads are mostly I/O-bound during env setup)
          maxWorkers: process.env.CI ? 6 : undefined,
          minWorkers: process.env.CI ? 2 : undefined,
          // Vitest 4 requires unique groupOrder when projects have different maxWorkers
          sequence: { groupOrder: 2 },
        },
      },
    ],
  },
})
