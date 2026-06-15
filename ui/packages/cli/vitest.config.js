import { defineConfig } from 'vitest/config'

export default defineConfig({
  cacheDir: '.cache',
  test: {
    environment: 'node',
    pool: 'threads',
    include: ['src/**/*.test.ts'],
    // CLI subprocess tests build/spawn child processes — give them headroom.
    testTimeout: 60_000,
    hookTimeout: 60_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/bin.ts', 'src/index.ts'],
      reporter: ['text-summary'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
})
