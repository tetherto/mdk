import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

const alias = {
  '@': resolve(__dirname, './src/foundation'),
  '@core': resolve(__dirname, './src/core'),
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
  'src/foundation/utils/specs/**/*.test.ts',
  'src/foundation/constants/specs/**/*.test.ts',
  'src/foundation/specs/**/*.test.ts',
  'src/foundation/**/*-utils.test.ts',
  'src/foundation/**/*.utils.test.ts',
  'src/foundation/**/*.const.test.ts',
  'src/foundation/**/*.constants.test.ts',
  'src/foundation/**/*.adapters.test.ts',
  'src/foundation/**/*.mappers.test.ts',
  'src/foundation/**/helper.test.ts',
  'src/foundation/**/column-constants.test.ts',
  'src/foundation/components/domain/reporting-tool/multi-site/**/specs/**/*.test.ts',
  'src/foundation/components/domain/reporting-tool/multi-site/**/*.util.test.ts',
  'src/foundation/components/domain/reporting-tool/multi-site/**/lib/specs/**/*.test.ts',
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
        'src/core/components/logs/**',
        'src/core/components/labeled-card/**',
        'src/core/types/**',
        // TEMP: ported mining-report UI — util/lib tests only; see mining-report/PORTING.md.
        'src/foundation/components/domain/reporting-tool/multi-site/mining-report/components/**',
        'src/foundation/components/domain/reporting-tool/multi-site/mining-report/periods/**',
        'src/foundation/components/domain/reporting-tool/multi-site/mining-report/report-charts/**',
        'src/foundation/components/domain/reporting-tool/multi-site/mining-report/report-metric-card/**',
        'src/foundation/components/domain/reporting-tool/multi-site/mining-report/lib/**',
        'src/foundation/components/domain/reporting-tool/multi-site/mining-report/mining-report.tsx',
        'src/foundation/components/domain/reporting-tool/multi-site/mining-report/mining-report-cover.tsx',
        'src/foundation/components/domain/reporting-tool/multi-site/mining-report/create-report-config.tsx',
        'src/foundation/components/domain/reporting-tool/multi-site/mining-report/mining-report-shell.tsx',
        'src/foundation/components/domain/reporting-tool/multi-site/mining-report/mining-report-export-control.tsx',
        'src/foundation/components/domain/reporting-tool/multi-site/site-reports/site-reports.tsx',
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
     *   • core-dom        — core component tests with light DOM mocks (no react-dom remap)
     *   • foundation-dom  — foundation component tests with heavy react/react-dom mocks
     *
     * Splitting `core-dom` from `foundation-dom` is required because the
     * foundation setup mocks `react.createContext` and `react-dom`, which
     * breaks core component tests that rely on real React contexts (e.g.
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
            'src/foundation/**/use-*.test.{ts,tsx}',
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
          name: 'core-dom',
          pool: 'threads',
          environment: 'happy-dom',
          setupFiles: ['./src/core/test-utils/setup-tests.ts'],
          include: ['src/core/**/*.{test,spec}.{ts,tsx}'],
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
          name: 'foundation-dom',
          pool: 'threads',
          environment: 'happy-dom',
          setupFiles: ['./src/test-utils/setup-tests.ts'],
          include: ['src/foundation/**/*.{test,spec}.{ts,tsx}'],
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
