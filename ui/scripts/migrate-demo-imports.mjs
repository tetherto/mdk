#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Rewrites demo-app imports of the now-removed packages
 *   @tetherto/mdk-core-ui       → @tetherto/mdk-react-devkit/primitives
 *   @tetherto/mdk-foundation-ui → @tetherto/mdk-react-devkit/domain
 *   @tetherto/mdk-foundation-ui/<sub> → @tetherto/mdk-react-devkit/<sub>
 *   SCSS @use of those packages too.
 *
 * Idempotent — safe to re-run.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DEMO_SRC = resolve(ROOT, 'apps/catalog')

const SCRIPT_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])
const STYLE_EXTS = new Set(['.scss', '.sass', '.css'])

const walk = function* (root) {
  for (const entry of readdirSync(root)) {
    if (entry === 'node_modules' || entry === 'dist' || entry === '.turbo') continue
    const full = join(root, entry)
    const st = statSync(full)
    if (st.isDirectory()) yield* walk(full)
    else yield full
  }
}

const REPLACEMENTS = [
  // foundation/<sub>: keep <sub> as the new subpath
  [/(['"])@tetherto\/mdk-foundation-ui\/([^'"]+)\1/g, '$1@tetherto/mdk-react-devkit/$2$1'],
  // bare foundation: → /foundation
  [/(['"])@tetherto\/mdk-foundation-ui\1/g, '$1@tetherto/mdk-react-devkit/domain$1'],
  // core/styles.css → unified styles.css
  [/(['"])@tetherto\/mdk-core-ui\/styles\.css\1/g, '$1@tetherto/mdk-react-devkit/styles.css$1'],
  // core/styles → unified /styles
  [/(['"])@tetherto\/mdk-core-ui\/styles\1/g, '$1@tetherto/mdk-react-devkit/styles$1'],
  // core/<sub> → /core/<sub>... but most things have a flat top-level export, so just go to /core
  // Actually most code does `from '@tetherto/mdk-core-ui'` — handled by next pattern.
  // For e.g. `'@tetherto/mdk-core-ui/dist/...'` — we forward to /core/...
  [/(['"])@tetherto\/mdk-core-ui\/([^'"]+)\1/g, '$1@tetherto/mdk-react-devkit/primitives/$2$1'],
  // bare core: → /core
  [/(['"])@tetherto\/mdk-core-ui\1/g, '$1@tetherto/mdk-react-devkit/primitives$1'],
]

let touched = 0

for (const file of walk(DEMO_SRC)) {
  const ext = file.slice(file.lastIndexOf('.'))
  if (!SCRIPT_EXTS.has(ext) && !STYLE_EXTS.has(ext)) continue
  let src
  try {
    src = readFileSync(file, 'utf8')
  } catch {
    continue
  }
  if (!src.includes('@tetherto/mdk-core-ui') && !src.includes('@tetherto/mdk-foundation-ui'))
    continue

  let next = src
  for (const [pat, repl] of REPLACEMENTS) {
    next = next.replace(pat, repl)
  }

  if (next !== src) {
    writeFileSync(file, next, 'utf8')
    touched += 1
    console.log(`✓ ${file.slice(ROOT.length + 1)}`)
  }
}

console.log(`\nRewrote ${touched} demo files.`)
