import { defineConfig } from 'vitest/config'

// Kept apart from vite.config.ts, whose plugins import the built MDK packages:
// the specs test plain logic and must run without them.
export default defineConfig({
  test: { include: ['src/**/*.test.ts'] },
})
