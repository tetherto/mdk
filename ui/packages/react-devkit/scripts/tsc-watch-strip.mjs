#!/usr/bin/env node

/**
 * Watch-mode wrapper that runs `tsc --watch`, then pipes `tsc-alias` (to
 * rewrite `@core` / `@/*` paths) and `strip-style-imports.mjs` (to remove
 * side-effect `.scss` imports) after every successful rebuild.
 *
 * `npm run build:ts` chains all three in one-shot mode. Watch mode
 * (`tsc --watch`) re-emits files on every change and would otherwise:
 * - leave bare `@core` imports in dist, which Vite can't resolve →
 *   "Failed to resolve import '@core'" at the demo;
 * - re-introduce the side-effect `.scss` / `.css` imports that strip-style-
 *   imports removes → "Failed to resolve import './foo.scss'".
 *
 * This wrapper watches tsc's stdout for the "Watching for file changes."
 * marker that tsc emits after every successful incremental compile, and
 * re-runs the two post-steps then. Both post-steps are idempotent.
 */
import { spawn, spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PACKAGE_ROOT = resolve(__dirname, '..')
const STRIP_SCRIPT = resolve(__dirname, 'strip-style-imports.mjs')
const DIST_DIR = resolve(PACKAGE_ROOT, 'dist')

const READY_MARKER = /Watching for file changes\./

const runTscAlias = () => {
  const result = spawnSync('npx', ['tsc-alias', '-p', 'tsconfig.build.json'], {
    stdio: 'inherit',
    cwd: PACKAGE_ROOT,
  })
  if (result.status !== 0) {
    console.error(`tsc-alias exited with status ${result.status}`)
  }
}

const runStrip = () => {
  const result = spawnSync(process.execPath, [STRIP_SCRIPT, DIST_DIR], {
    stdio: 'inherit',
    cwd: PACKAGE_ROOT,
  })
  if (result.status !== 0) {
    console.error(`strip-style-imports exited with status ${result.status}`)
  }
}

const runPostSteps = () => {
  runTscAlias()
  runStrip()
}

const tscArgs = ['tsc', '--watch', '--preserveWatchOutput', '-p', 'tsconfig.build.json']
const tsc = spawn('npx', tscArgs, {
  cwd: PACKAGE_ROOT,
  stdio: ['ignore', 'pipe', 'inherit'],
  env: process.env,
})

let buffer = ''
tsc.stdout.on('data', (chunk) => {
  const text = chunk.toString()
  process.stdout.write(text)
  buffer += text
  if (READY_MARKER.test(buffer)) {
    buffer = ''
    runPostSteps()
  }
})

tsc.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  else process.exit(code ?? 0)
})

const forward = (signal) => {
  if (!tsc.killed) tsc.kill(signal)
}
process.on('SIGINT', () => forward('SIGINT'))
process.on('SIGTERM', () => forward('SIGTERM'))
