#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Consumer-cost + tree-shaking regression gate for @tetherto/mdk-react-devkit.
 *
 * Builds throwaway consumer entry points against the BUILT dist (minified,
 * natural bundler code-splitting — i.e. what a real app's Vite/webpack build
 * produces) and measures, per import:
 *   - initial   = bytes shipped in the entry's synchronous bundle
 *   - deferred  = bytes split into lazy chunks (loaded on demand, e.g. when a
 *                 chart first renders)
 * It also tracks where the heavy chart engines (chart.js / lightweight-charts)
 * land using Rollup's module graph (authoritative — not string matching).
 *
 * Contract enforced (non-zero exit on violation):
 *   - Importing a non-chart component (Button) pulls ZERO chart-engine bytes.
 *   - Chart components keep their engine OUT of the initial bundle (it must be
 *     in a deferred/lazy chunk).
 *   - chart.js and lightweight-charts stay isolated from each other.
 *
 * Requires dist to be built first (npm run build). Run via `npm run size:consumer`.
 */
import { Buffer } from 'node:buffer'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const __dirname = dirname(fileURLToPath(import.meta.url))
const UI_ROOT = resolve(__dirname, '..')
const CORE = resolve(UI_ROOT, 'packages/react-devkit/dist/primitives/index.js')
const ROOT = resolve(UI_ROOT, 'packages/react-devkit/dist/index.js')

if (!existsSync(CORE)) {
  console.error(`✖ Built dist not found at ${CORE}. Run \`npm run build\` first.`)
  process.exit(2)
}

const { build } = await import(resolve(UI_ROOT, 'node_modules/vite/dist/node/index.js'))

// name -> { from, symbol, expect } where expect is the engine allowed to appear
// ('' = none allowed; 'chartjs' / 'lightweight' = allowed but only deferred).
const ENTRIES = [
  { name: 'root: Button', from: ROOT, symbol: 'Button', expect: '' },
  { name: 'core: Button', from: CORE, symbol: 'Button', expect: '' },
  { name: 'core: DoughnutChart', from: CORE, symbol: 'DoughnutChart', expect: 'chartjs' },
  { name: 'core: AreaChart', from: CORE, symbol: 'AreaChart', expect: 'chartjs' },
  { name: 'core: BarChart', from: CORE, symbol: 'BarChart', expect: 'chartjs' },
  { name: 'core: LineChart', from: CORE, symbol: 'LineChart', expect: 'lightweight' },
]

const engineOfModule = (id) => {
  if (/node_modules\/(?:chart\.js|react-chartjs-2|chartjs-)/.test(id)) return 'chartjs'
  if (/node_modules\/lightweight-charts/.test(id)) return 'lightweight'
  return null
}

const fmt = (b) => (b === 0 ? '—' : `${(b / 1024).toFixed(1)} KB`)
const padR = (s, n) => String(s).padEnd(n)
const padL = (s, n) => String(s).padStart(n)

const work = resolve(tmpdir(), 'mdk-treeshake-check')
rmSync(work, { recursive: true, force: true })

const results = []
for (const { name, from, symbol, expect } of ENTRIES) {
  const root = resolve(work, symbol + name.replace(/\W/g, ''))
  mkdirSync(root, { recursive: true })
  writeFileSync(resolve(root, 'entry.js'), `export { ${symbol} } from ${JSON.stringify(from)}\n`)

  const out = await build({
    root,
    logLevel: 'silent',
    build: {
      write: false,
      minify: true,
      lib: { entry: resolve(root, 'entry.js'), formats: ['es'], fileName: 'entry' },
      rollupOptions: { treeshake: { moduleSideEffects: false } },
    },
  })
  const bundle = Array.isArray(out) ? out[0] : out
  const chunks = bundle.output.filter((o) => o.type === 'chunk')
  const entry = chunks.find((c) => c.isEntry)

  // Chunks reachable from the entry via STATIC imports only = initial bundle.
  const reachable = new Set([entry.fileName])
  for (let changed = true; changed; ) {
    changed = false
    for (const c of chunks) {
      if (!reachable.has(c.fileName)) continue
      for (const imp of c.imports ?? []) {
        if (!reachable.has(imp)) {
          reachable.add(imp)
          changed = true
        }
      }
    }
  }

  const gz = (c) => gzipSync(Buffer.from(c.code)).length
  let initial = 0
  let deferred = 0
  const engineIn = { initial: new Set(), deferred: new Set() }
  for (const c of chunks) {
    const where = reachable.has(c.fileName) ? 'initial' : 'deferred'
    if (where === 'initial') initial += gz(c)
    else deferred += gz(c)
    for (const id of Object.keys(c.modules ?? {})) {
      const eng = engineOfModule(id)
      if (eng) engineIn[where].add(eng)
    }
  }
  results.push({ name, expect, initial, deferred, engineIn })
}

rmSync(work, { recursive: true, force: true })

console.log('\nConsumer import cost — @tetherto/mdk-react-devkit (minified, real splitting)\n')
console.log(`${padR('import', 22)}  ${padL('initial', 9)}  ${padL('deferred', 9)}  engines`)
console.log('-'.repeat(70))

const violations = []
for (const r of results) {
  const engInit = [...r.engineIn.initial]
  const engDef = [...r.engineIn.deferred]
  const engDesc =
    [...engInit.map((e) => `${e}:initial`), ...engDef.map((e) => `${e}:deferred`)].join(', ') || '—'
  console.log(`${padR(r.name, 22)}  ${padL(fmt(r.initial), 9)}  ${padL(fmt(r.deferred), 9)}  ${engDesc}`)

  // No engine may ever sit in a non-chart import's bundle.
  if (r.expect === '' && (engInit.length || engDef.length)) {
    violations.push(`${r.name} pulled a chart engine (${[...engInit, ...engDef].join(', ')})`)
  }
  // A chart component's engine must be deferred, never in the initial bundle.
  if (r.expect && engInit.length) {
    violations.push(`${r.name} ships ${engInit.join(', ')} in the INITIAL bundle (should be lazy)`)
  }
  // Engines must stay isolated from each other.
  const seen = new Set([...engInit, ...engDef])
  for (const e of seen) {
    if (r.expect && e !== r.expect) {
      violations.push(`${r.name} unexpectedly pulled ${e} (expected only ${r.expect})`)
    }
  }
}
console.log('')

if (violations.length) {
  console.error('✖ Regression:')
  for (const v of violations) console.error(`  - ${v}`)
  console.error('')
  process.exit(1)
}
console.log('✓ Non-chart imports are engine-free; chart engines are deferred and isolated.\n')
