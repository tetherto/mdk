import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { runDocsBuild } from './docs-build.js'
import { ADAPTER_DIR, CORE_DIR, DEVKIT_DIR, noop } from '../test-utils.js'

const FIXED_NOW = '2020-01-01T00:00:00.000Z'

/** Read a written tree into a relPath → contents map (for byte comparisons). */
const readTree = (dir: string): Map<string, string> => {
  const out = new Map<string, string>()
  const walk = (current: string): void => {
    for (const entry of readdirSync(current)) {
      const full = join(current, entry)
      if (statSync(full).isDirectory()) walk(full)
      else out.set(relative(dir, full).split('\\').join('/'), readFileSync(full, 'utf8'))
    }
  }
  if (existsSync(dir)) walk(dir)
  return out
}

describe('runDocsBuild', () => {
  let tmp: string
  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'mdk-docs-build-'))
  })
  afterEach(() => rmSync(tmp, { recursive: true, force: true }))

  const run = (outDir: string, extra: Record<string, unknown> = {}) =>
    runDocsBuild({
      packageName: '@tetherto/mdk-react-devkit',
      devkitDir: DEVKIT_DIR,
      adapterDir: ADAPTER_DIR,
      coreDir: CORE_DIR,
      outDir,
      versionLabel: '0.2.0',
      now: FIXED_NOW,
      cwd: tmp,
      out: noop,
      ...extra,
    })

  it('writes a non-empty dataset whose counts match the meta stamp', async () => {
    const outDir = join(tmp, 'out')
    const result = await run(outDir)
    expect(result.dataset.components.length).toBeGreaterThan(0)
    expect(result.dataset.hooks.length).toBeGreaterThan(0)

    const meta = JSON.parse(readFileSync(join(outDir, 'meta.json'), 'utf8'))
    expect(meta.counts.components).toBe(result.dataset.components.length)
    expect(meta.counts.hooks).toBe(result.dataset.hooks.length)
    expect(meta.generatedFrom.registrySchema).toBe('2.0.0')
    expect(existsSync(join(outDir, 'components.json'))).toBe(true)
    expect(existsSync(join(outDir, 'README.md'))).toBe(true)
  })

  it('merges adapter hooks and emits the ui-foundation stores catalog', async () => {
    const outDir = join(tmp, 'out')
    const result = await run(outDir)

    // hooks.json spans both packages.
    const packages = new Set(result.dataset.hooks.map((h) => h.package))
    expect(packages.has('react-devkit')).toBe(true)
    expect(packages.has('react-adapter')).toBe(true)

    // stores.json is written with the ui-foundation stores + query helpers.
    expect(existsSync(join(outDir, 'stores.json'))).toBe(true)
    const stores = JSON.parse(readFileSync(join(outDir, 'stores.json'), 'utf8'))
    expect(stores.stores.length).toBeGreaterThan(0)
    expect(stores.queryHelpers.length).toBeGreaterThan(0)
    expect(result.dataset.meta.counts.stores).toBe(stores.stores.length)
    expect(result.dataset.meta.counts.queryHelpers).toBe(stores.queryHelpers.length)
  })

  it('is byte-for-byte deterministic across runs (fixed clock)', async () => {
    const a = join(tmp, 'a')
    const b = join(tmp, 'b')
    await run(a)
    await run(b)
    expect(readTree(a)).toEqual(readTree(b))
  })

  it('rejects passing both --out and --docs-repo', async () => {
    await expect(
      run(join(tmp, 'out'), { docsRepo: join(tmp, 'docs') }),
    ).rejects.toThrow(/not both/)
  })

  describe('--report-only', () => {
    it('reports no drift against a freshly written tree', async () => {
      const outDir = join(tmp, 'out')
      await run(outDir)
      const result = await run(outDir, { reportOnly: true })
      expect(result.drift?.hasDrift).toBe(false)
      expect(result.written).toEqual([])
    })

    it('flags drift (and names the entry) when the committed catalog is stale', async () => {
      const outDir = join(tmp, 'out')
      await run(outDir)

      // Drop one component from the committed catalog to simulate page rot.
      const file = join(outDir, 'components.json')
      const committed = JSON.parse(readFileSync(file, 'utf8')) as Array<{ name: string }>
      const dropped = committed[0]!.name
      writeFileSync(file, `${JSON.stringify(committed.slice(1), null, 2)}\n`, 'utf8')

      const result = await run(outDir, { reportOnly: true })
      expect(result.drift?.hasDrift).toBe(true)
      expect(result.drift?.components.added).toContain(dropped)
    })
  })

  describe('leak guard', () => {
    it('aborts before writing anything when a forbidden string is present', async () => {
      const outDir = join(tmp, 'out')
      // `tetherto` is guaranteed to appear (package name in meta/README).
      await expect(run(outDir, { forbiddenPatterns: ['tetherto'] })).rejects.toThrow(/forbidden/)
      expect(existsSync(outDir)).toBe(false)
    })
  })

  describe('--docs-repo', () => {
    it('writes under src/data/<version>/generated, installs components, reports coverage', async () => {
      const docsRepo = join(tmp, 'mdk-docs')
      const result = await runDocsBuild({
        packageName: '@tetherto/mdk-react-devkit',
        devkitDir: DEVKIT_DIR,
        docsRepo,
        versionLabel: '0.2.0',
        now: FIXED_NOW,
        cwd: tmp,
        out: noop,
      })
      const generated = join(docsRepo, 'src', 'data', '0.2.0', 'generated')
      expect(result.outDir).toBe(generated)
      expect(existsSync(join(generated, 'components.json'))).toBe(true)
      expect(existsSync(join(docsRepo, 'src', 'components', 'component-doc.tsx'))).toBe(true)
      expect(existsSync(join(docsRepo, 'src', 'components', 'props-table.tsx'))).toBe(true)
      // The curated catalog files are absent in the bare fixture, so every
      // generated entry shows up as "new" and nothing is reported as page rot.
      expect(result.coverage?.newComponents.length).toBeGreaterThan(0)
      expect(result.coverage?.removedComponents).toEqual([])
    })

    it('does not overwrite a rendering component the writer has edited', async () => {
      const docsRepo = join(tmp, 'mdk-docs')
      const dest = join(docsRepo, 'src', 'components')
      rmSync(dest, { recursive: true, force: true })
      // Pre-seed an edited component; the install must leave it untouched.
      const { mkdirSync } = await import('node:fs')
      mkdirSync(dest, { recursive: true })
      writeFileSync(join(dest, 'props-table.tsx'), '// hand-edited\n', 'utf8')

      await runDocsBuild({
        packageName: '@tetherto/mdk-react-devkit',
        devkitDir: DEVKIT_DIR,
        docsRepo,
        versionLabel: '0.2.0',
        now: FIXED_NOW,
        cwd: tmp,
        out: noop,
      })
      expect(readFileSync(join(dest, 'props-table.tsx'), 'utf8')).toBe('// hand-edited\n')
    })
  })
})
