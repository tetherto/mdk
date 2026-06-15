#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * One-off rename script: rewrites every reference to the old devkit package
 * name (`@tetherto/mdk-ui-devkit-react`) to the new convention
 * (`@tetherto/mdk-react-devkit`) across the workspace.
 *
 * Idempotent — safe to re-run.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.turbo', '.next'])

const TEXT_EXTS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.md',
  '.scss',
  '.sass',
  '.css',
  '.html',
  '.yml',
  '.yaml',
  '.sh',
  '.d.ts',
])

const REPLACEMENTS = [['@tetherto/mdk-ui-devkit-react', '@tetherto/mdk-react-devkit']]

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) yield* walk(full)
    else yield full
  }
}

const isTextFile = (filePath) => {
  for (const ext of TEXT_EXTS) {
    if (filePath.endsWith(ext)) return true
  }
  return false
}

let totalFiles = 0
let totalReplacements = 0

for (const filePath of walk(ROOT)) {
  // Don't rewrite this script itself or the lockfile (npm regenerates it).
  if (filePath === fileURLToPath(import.meta.url)) continue
  if (filePath.endsWith('package-lock.json')) continue
  if (!isTextFile(filePath)) continue

  const original = readFileSync(filePath, 'utf8')
  let next = original
  let fileReplacements = 0
  for (const [from, to] of REPLACEMENTS) {
    const before = next
    next = next.split(from).join(to)
    fileReplacements += (
      before.match(new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []
    ).length
  }
  if (next !== original) {
    writeFileSync(filePath, next)
    totalFiles += 1
    totalReplacements += fileReplacements
  }
}

console.log(`Rewrote ${totalReplacements} reference(s) across ${totalFiles} file(s).`)
