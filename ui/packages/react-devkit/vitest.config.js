import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

const alias = {
  '@domain': resolve(__dirname, './src/domain'),
  '@primitives': resolve(__dirname, './src/primitives'),
}

const define = {
  'process.env': JSON.stringify({ NODE_ENV: 'test' }),
  global: 'globalThis',
}

const sharedTestConfig = {
  globals: true,
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
  'src/domain/utils/specs/**/*.test.ts',
  'src/domain/constants/specs/**/*.test.ts',
  'src/domain/specs/**/*.test.ts',
  'src/domain/**/*-utils.test.ts',
  'src/domain/**/*.utils.test.ts',
  'src/domain/**/*.const.test.ts',
  'src/domain/**/*.constants.test.ts',
  'src/domain/**/*.adapters.test.ts',
  'src/domain/**/*.mappers.test.ts',
  'src/domain/**/helper.test.ts',
  'src/domain/**/column-constants.test.ts',
]

export default defineConfig({
  plugins: [react()],
  resolve: { alias },
  define,
  cacheDir: '.cache',

  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text-summary'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/**/*.stories.{ts,tsx}',
        'src/**/*.example.{ts,tsx}',
        'src/**/index.{ts,tsx}',
        'src/test/**',
        'src/**/test-utils/**',
        'src/**/*.d.ts',
        'src/**/icons/**',
        'src/primitives/components/logs/**',
        'src/primitives/components/labeled-card/**',
        'src/primitives/types/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },

    /**
     * Three isolated worker pools:
     *   • node            — fast pure-logic tests, no DOM overhead
     *   • primitives-dom  — primitives component tests with light DOM mocks (no react-dom remap)
     *   • domain-dom      — domain component tests with heavy react/react-dom mocks
     *
     * Splitting `primitives-dom` from `domain-dom` is required because the
     * domain setup mocks `react.createContext` and `react-dom`, which
     * breaks primitives component tests that rely on real React contexts (e.g.
     * react-hook-form integrations in the Form components).
     */
    projects: [
      {
        plugins: [react()],
        resolve: { alias },
        define,
        test: {
          ...sharedTestConfig,
          name: 'node',
          pool: 'threads',
          environment: 'node',
          setupFiles: ['./src/test-utils/setup-tests.ts'],
          include: NODE_TEST_GLOBS,
          exclude: [
            'node_modules',
            'dist',
            'build',
            '.next',
            'coverage',
            '**/*.d.ts',
            'src/domain/**/use-*.test.{ts,tsx}',
          ],
          maxWorkers: process.env.CI ? 4 : undefined,
          minWorkers: process.env.CI ? 2 : undefined,
          sequence: { groupOrder: 1 },
        },
      },
      {
        plugins: [react()],
        resolve: { alias },
        define,
        test: {
          ...sharedTestConfig,
          name: 'primitives-dom',
          pool: 'threads',
          environment: 'happy-dom',
          setupFiles: ['./src/primitives/test-utils/setup-tests.ts'],
          include: ['src/primitives/**/*.{test,spec}.{ts,tsx}'],
          exclude: ['node_modules', 'dist', 'build', '.next', 'coverage', '**/*.d.ts'],
          maxWorkers: process.env.CI ? 4 : undefined,
          minWorkers: process.env.CI ? 2 : undefined,
          sequence: { groupOrder: 2 },
        },
      },
      {
        plugins: [react()],
        resolve: { alias },
        define,
        test: {
          ...sharedTestConfig,
          name: 'domain-dom',
          pool: 'threads',
          environment: 'happy-dom',
          setupFiles: ['./src/test-utils/setup-tests.ts'],
          include: ['src/domain/**/*.{test,spec}.{ts,tsx}'],
          exclude: [
            'node_modules',
            'dist',
            'build',
            '.next',
            'coverage',
            '**/*.d.ts',
            ...NODE_TEST_GLOBS,
          ],
          maxWorkers: process.env.CI ? 4 : undefined,
          minWorkers: process.env.CI ? 2 : undefined,
          sequence: { groupOrder: 3 },
        },
      },
    ],
  },
})
