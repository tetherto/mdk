#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * One-off migration script: rewrites stale internal package imports
 * inside packages/react-devkit/src/foundation after the core+foundation merge.
 *
 *   - "@tetherto/mdk-core-ui"       → relative path to "src/core"
 *   - "@tetherto/mdk-foundation-ui" → relative path to "src/foundation"
 *   - SCSS @use "@tetherto/mdk-core-ui/styles" → relative path to core mixins
 *
 * Idempotent — safe to re-run.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DEVKIT_ROOT = resolve(__dirname, '..')
const FOUNDATION_DIR = resolve(DEVKIT_ROOT, 'src/foundation')
const CORE_DIR = resolve(DEVKIT_ROOT, 'src/core')

const SCRIPT_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])
const STYLE_EXTS = new Set(['.scss', '.sass', '.css'])

const CORE_PKG = '@tetherto/mdk-core-ui'
const FOUNDATION_PKG = '@tetherto/mdk-foundation-ui'

/**
 * Walk a directory and yield every absolute file path.
 */
const walk = function* (root) {
  for (const entry of readdirSync(root)) {
    const full = join(root, entry)
    const st = statSync(full)
    if (st.isDirectory()) yield* walk(full)
    else yield full
  }
}

/**
 * Resolve "@tetherto/mdk-core-ui[/sub]" → relative path from `fromFile` to `src/core[/sub]`.
 */
const resolveCorePath = (fromFile, sub) => {
  const target = sub ? resolve(CORE_DIR, sub) : CORE_DIR
  let rel = relative(dirname(fromFile), target)
  if (!rel.startsWith('.')) rel = `./${rel}`
  return rel
}

/**
 * Resolve "@tetherto/mdk-foundation-ui[/sub]" → relative path from `fromFile` to `src/foundation[/sub]`.
 */
const resolveFoundationPath = (fromFile, sub) => {
  const target = sub ? resolve(FOUNDATION_DIR, sub) : FOUNDATION_DIR
  let rel = relative(dirname(fromFile), target)
  if (!rel.startsWith('.')) rel = `./${rel}`
  return rel
}

const replaceScript = (file, src) => {
  let out = src

  // Match: import ... from "@tetherto/mdk-core-ui" | "@tetherto/mdk-core-ui/x"
  // Plus: import "@tetherto/mdk-core-ui/styles.css" style imports.
  out = out.replace(/(['"])@tetherto\/mdk-core-ui(\/[^'"]+)?\1/g, (match, quote, sub) => {
    const subPath = sub ? sub.slice(1) : ''
    // Special: "/styles.css" should resolve to compiled CSS — leave alone for now.
    if (subPath === 'styles.css') return match
    return `${quote}${resolveCorePath(file, subPath || 'index')}${quote}`
  })

  out = out.replace(/(['"])@tetherto\/mdk-foundation-ui(\/[^'"]+)?\1/g, (match, quote, sub) => {
    const subPath = sub ? sub.slice(1) : ''
    if (subPath === 'styles.css') return match
    return `${quote}${resolveFoundationPath(file, subPath || 'index')}${quote}`
  })

  return out
}

const replaceStyle = (file, src) => {
  let out = src

  // @use '@tetherto/mdk-core-ui/styles' as *;
  // → @use '../../../core/styles/mixins' as *;
  out = out.replace(
    /@(use|forward|import)\s+(['"])@tetherto\/mdk-core-ui(\/[^'"]+)?\2/g,
    (_match, kw, quote, sub) => {
      // Default subpath for SCSS is "styles" which we map to mixins (the public SCSS surface).
      let mapped
      if (!sub || sub === '/styles') {
        mapped = resolveCorePath(file, 'styles/mixins')
      } else {
        mapped = resolveCorePath(file, sub.slice(1))
      }
      return `@${kw} ${quote}${mapped}${quote}`
    },
  )

  out = out.replace(
    /@(use|forward|import)\s+(['"])@tetherto\/mdk-foundation-ui(\/[^'"]+)?\2/g,
    (_match, kw, quote, sub) => {
      const subPath = sub ? sub.slice(1) : 'index'
      const mapped = resolveFoundationPath(file, subPath)
      return `@${kw} ${quote}${mapped}${quote}`
    },
  )

  return out
}

let touched = 0
let scanned = 0

for (const file of walk(FOUNDATION_DIR)) {
  scanned += 1
  const ext = file.slice(file.lastIndexOf('.'))
  let src
  try {
    src = readFileSync(file, 'utf8')
  } catch {
    continue
  }
  if (!src.includes(CORE_PKG) && !src.includes(FOUNDATION_PKG)) continue

  let next = src
  if (SCRIPT_EXTS.has(ext)) next = replaceScript(file, src)
  else if (STYLE_EXTS.has(ext)) next = replaceStyle(file, src)
  else continue

  if (next !== src) {
    writeFileSync(file, next, 'utf8')
    touched += 1
    console.log(`✓ ${relative(DEVKIT_ROOT, file)}`)
  }
}

// Also rewrite a small set of files inside src/core that reference the old package name
// (e.g. test specs or the index header).
for (const file of walk(CORE_DIR)) {
  scanned += 1
  const ext = file.slice(file.lastIndexOf('.'))
  let src
  try {
    src = readFileSync(file, 'utf8')
  } catch {
    continue
  }
  if (!src.includes(CORE_PKG)) continue

  // Only touch import/require statements; leave doc comments alone.
  let next = src
  if (SCRIPT_EXTS.has(ext)) {
    next = next.replace(
      /(from\s+['"])@tetherto\/mdk-core-ui(\/[^'"]+)?(['"])/g,
      (_m, prefix, sub, quote) => {
        const subPath = sub ? sub.slice(1) : ''
        let rel = relative(dirname(file), subPath ? resolve(CORE_DIR, subPath) : CORE_DIR)
        if (!rel.startsWith('.')) rel = `./${rel}`
        return `${prefix}${rel}${quote}`
      },
    )
  }

  if (next !== src) {
    writeFileSync(file, next, 'utf8')
    touched += 1
    console.log(`✓ ${relative(DEVKIT_ROOT, file)}`)
  }
}

console.log(`\nScanned ${scanned} files, rewrote ${touched}.`)
