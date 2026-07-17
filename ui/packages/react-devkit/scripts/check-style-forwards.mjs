#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Guard against silently style-less components.
 *
 * Every component's `.scss` is side-effect imported from its `.tsx`
 * (`import "./foo.scss"`) so a consumer building from source picks styles up
 * per-component. But the published package strips those imports from `dist/*.js`
 * (see `strip-style-imports.mjs`) — so a component's stylesheet only ships if it
 * is ALSO reachable via `@forward` from one of the bundled entry stylesheets
 * (`src/styles.scss` → primitives, `src/styles-domain.scss` → domain).
 *
 * A stylesheet that is side-effect imported but NOT reachable from an entry
 * compiles fine, passes tests, and ships a component with ZERO styles in the
 * built package — exactly how the Container Widgets card rendered as unstyled
 * full-width rows. This check fails the build when that happens.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SRC = resolve(__dirname, '../src')
const PRIMITIVES = resolve(SRC, 'primitives')
const LOAD_PATHS = [resolve(PRIMITIVES, 'styles')] // vite scss loadPaths
const ENTRIES = [resolve(SRC, 'styles.scss'), resolve(SRC, 'styles-domain.scss')]

const walk = (dir, test, acc = []) => {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist') continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, test, acc)
    else if (test(full)) acc.push(full)
  }
  return acc
}

/** Resolve a Sass `@use`/`@forward`/JS-import spec to an absolute file, or null. */
const resolveSpec = (fromFile, spec) => {
  const clean = spec.replace(/\.scss$/, '')
  const bases = []
  if (clean.startsWith('@primitives/')) bases.push(resolve(PRIMITIVES, clean.slice('@primitives/'.length)))
  else if (clean.startsWith('.')) bases.push(resolve(dirname(fromFile), clean))
  else {
    bases.push(resolve(dirname(fromFile), clean))
    for (const lp of LOAD_PATHS) bases.push(resolve(lp, clean))
  }
  for (const base of bases) {
    const dir = dirname(base)
    const name = base.slice(dir.length + 1)
    const candidates = [
      `${base}.scss`,
      join(dir, `_${name}.scss`),
      join(base, 'index.scss'),
      join(base, '_index.scss'),
    ]
    for (const c of candidates) if (existsSync(c)) return c
  }
  return null
}

// 1. Every .scss reachable via @forward/@use from a bundled entry stylesheet.
const reachable = new Set()
const queue = [...ENTRIES]
const DIRECTIVE = /@(?:use|forward)\s+['"]([^'"]+)['"]/g
while (queue.length) {
  const file = queue.pop()
  if (reachable.has(file) || !existsSync(file)) continue
  reachable.add(file)
  const code = readFileSync(file, 'utf8')
  for (const [, spec] of code.matchAll(DIRECTIVE)) {
    const target = resolveSpec(file, spec)
    if (target) queue.push(target)
  }
}

// 2. Every .scss side-effect imported from a .ts/.tsx source (i.e. stripped from
//    dist, so it must be reachable from an entry to ship its styles).
const IMPORT = /import\s+['"]([^'"]+\.scss)['"]/g
// Example (`*.example.tsx`) and spec/test sources are excluded from the built
// package, so their style imports are never stripped from dist and need not be
// bundled — only shipped component sources must reach an entry stylesheet.
const isShipped = (f) =>
  /\.tsx?$/.test(f) &&
  !f.endsWith('.d.ts') &&
  !/\.example\.tsx?$/.test(f) &&
  !/\.(?:test|spec)\.tsx?$/.test(f) &&
  !/(?:^|\/)(?:specs?|__tests__|test-utils)\//.test(f)
const mustBundle = new Set()
for (const src of walk(SRC, isShipped)) {
  const code = readFileSync(src, 'utf8')
  for (const [, spec] of code.matchAll(IMPORT)) {
    const target = resolveSpec(src, spec)
    if (target && extname(target) === '.scss') mustBundle.add(target)
  }
}

// 3. Anything imported for its side effects but not reachable ships styleless.
const orphans = [...mustBundle].filter((f) => !reachable.has(f)).sort()

if (orphans.length) {
  console.error(
    `\n❌ ${orphans.length} component stylesheet(s) are imported by a component but NOT`,
  )
  console.error('   @forward-ed from a bundled entry stylesheet, so they ship with NO styles:\n')
  for (const f of orphans) console.error(`   • ${f.slice(SRC.length + 1)}`)
  console.error('\n   Add each to src/domain/styles/index.scss (domain) or the primitives')
  console.error('   styles index (primitives) with an `@forward` line, then rebuild.\n')
  process.exit(1)
}

console.log(`✓ All ${mustBundle.size} component stylesheets are reachable from a bundled entry.`)
