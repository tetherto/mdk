#!/usr/bin/env node
/**
 * Migrate `vi.mock('<deep relative>', ...)` calls in react-devkit tests to use
 * the `@/*` alias that maps to `src/domain/*` (already configured in both
 * tsconfig and vitest.config). Two birds, one stone:
 *   1. Fix broken mocks (post-flatten refactor left some paths with one extra
 *      '../' that silently no-ops the mock).
 *   2. Make mocks resilient to future folder moves.
 *
 * We only touch `vi.mock(...)` and the duplicate `import('<same path>')` type
 * literal inside the factory.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'

const PKG_ROOT = path.resolve(process.argv[2] ?? 'packages/react-devkit')
const SRC_ROOT = path.join(PKG_ROOT, 'src')

// Mirror vitest.config.js + tsconfig.json alias map. Order matters: longer
// prefixes should be tried first so '@primitives' wins over '@'.
const ALIAS_MAP = [
  ['@primitives', path.join(SRC_ROOT, 'core')],
  ['@', path.join(SRC_ROOT, 'foundation')],
]

const EXT_CANDIDATES = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js']

const exists = async (p) => {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

const resolveModule = async (absBase) => {
  for (const ext of EXT_CANDIDATES) {
    if (await exists(absBase + ext)) return absBase + ext
  }
  return null
}

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === 'dist') continue
      yield* walk(full)
    } else if (/\.test\.(?:ts|tsx)$/.test(e.name)) {
      yield full
    }
  }
}

/**
 * If `rel` does not resolve from `testFile`, try removing leading '../' to
 * recover the intended target. Returns the corrected absolute path, or null
 * when no fix is found (or the original already resolves — we deliberately
 * leave working paths alone to avoid churn).
 */
const resolveCanonical = async (testFile, rel) => {
  const dir = path.dirname(testFile)
  const direct = path.resolve(dir, rel)
  if (await resolveModule(direct)) return null

  // Path is broken — try removing 1–3 leading '../' to recover it.
  const m = rel.match(/^((?:\.\.\/)+)(.*)$/)
  if (!m) return null
  const dotCount = m[1].length / 3
  const rest = m[2]
  for (let drop = 1; drop <= Math.min(3, dotCount - 1); drop++) {
    const candidate = '../'.repeat(dotCount - drop) + rest
    const abs = path.resolve(dir, candidate)
    if (await resolveModule(abs)) return abs
  }
  return null
}

const stripModuleSuffix = (p) =>
  // Drop trailing /index.{ts,tsx,js,jsx} and bare extension.
  p.replace(/\/index\.(?:tsx?|jsx?)$/, '').replace(/\.(?:tsx?|jsx?)$/, '')

const toAlias = (absTarget) => {
  const target = stripModuleSuffix(absTarget)
  for (const [prefix, root] of ALIAS_MAP) {
    const rel = path.relative(root, target)
    if (rel.startsWith('..') || path.isAbsolute(rel)) continue
    if (rel === '') return prefix
    return `${prefix}/${rel.split(path.sep).join('/')}`
  }
  return null
}

const VI_MOCK_RE = /vi\.mock\(\s*(['"])(\.\.?\/[^'"]+)\1/g
// Match `from '<relative>'` and `import('<relative>')` for static + type imports.
const IMPORT_RE = /(?:from|import)\s*(?:\(\s*)?(['"])(\.\.?\/[^'"]+)\1/g

let filesChanged = 0
let mocksRewritten = 0
let mocksBroken = 0
const brokenReport = []

for await (const file of walk(SRC_ROOT)) {
  const original = await fs.readFile(file, 'utf8')
  let updated = original
  let fileChanged = false

  const matches = [...original.matchAll(VI_MOCK_RE), ...original.matchAll(IMPORT_RE)]
  for (const m of matches) {
    const quote = m[1]
    const rel = m[2]

    const abs = await resolveCanonical(file, rel)
    if (!abs) {
      mocksBroken++
      brokenReport.push(`${path.relative(PKG_ROOT, file)}: ${rel}`)
      continue
    }

    const alias = toAlias(abs)
    if (!alias || alias === rel) continue

    const oldLiteral = `${quote}${rel}${quote}`
    const newLiteral = `${quote}${alias}${quote}`
    if (!updated.includes(oldLiteral)) continue

    // Replace every occurrence of the exact literal in the file. This also
    // catches the duplicate `import('<same path>')` type expression that lives
    // inside the mock factory.
    updated = updated.split(oldLiteral).join(newLiteral)
    fileChanged = true
    mocksRewritten++
  }

  if (fileChanged) {
    await fs.writeFile(file, updated)
    filesChanged++
  }
}

process.stdout.write(`Files changed:     ${filesChanged}\n`)
process.stdout.write(`Mocks rewritten:   ${mocksRewritten}\n`)
process.stdout.write(`Unresolved mocks:  ${mocksBroken}\n`)
if (brokenReport.length) {
  process.stdout.write('\nMocks that did not resolve and need manual review:\n')
  for (const line of brokenReport.slice(0, 80)) process.stdout.write(`  ${line}\n`)
  if (brokenReport.length > 80) {
    process.stdout.write(`  ...and ${brokenReport.length - 80} more\n`)
  }
}
