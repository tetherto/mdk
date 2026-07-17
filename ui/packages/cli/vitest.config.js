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
      // docs-generate.ts is an orchestration entry (spawns `npm run build`, walks
      // the monorepo, delegates to the tested docs-build) — like bin.ts, not
      // meaningfully unit-testable.
      exclude: ['src/**/*.test.ts', 'src/bin.ts', 'src/index.ts', 'src/commands/docs-generate.ts'],
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
