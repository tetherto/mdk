import { describe, expect, it } from 'vitest'

import {
  buildDataset,
  computeDrift,
  datasetToFiles,
  diffCatalog,
  diffFiles,
  type DocsComponentRecord,
  type DocsDataset,
  type DocsHookRecord,
  serializeJson,
  stripUsageLinks,
} from './docs-data.js'
import type { AdapterHook, CoreQueryHelper, CoreStore, Registry } from './registry-loader.js'

/** A small hand-built registry exercising every branch of `buildDataset`. */
const makeRegistry = (): Registry => ({
  version: '1.4.0',
  package: '@tetherto/test-devkit',
  packageVersion: '9.9.9',
  generatedAt: '2020-01-01T00:00:00.000Z',
  generatedFrom: { gitSha: 'abc123' },
  components: [
    {
      name: 'Bravo',
      path: 'src/primitives/bravo/Bravo.tsx',
      description: 'short desc',
      descriptionFull: 'the full, untruncated description',
      tier: 'agent-ready',
      public: true,
      category: 'cards',
      props: [
        {
          name: 'value',
          type: 'string',
          required: true,
          default: '"x"',
          description: 'the value prop',
        },
        { name: 'flag', type: 'boolean', required: false },
      ],
      usageDoc: 'src/primitives/bravo/USAGE.md',
      // intentionally unsorted to assert deterministic ordering
      examples: ['src/primitives/bravo/two.tsx', 'src/primitives/bravo/one.tsx'],
    },
    {
      name: 'Alpha',
      path: 'src/domain/alpha/Alpha.tsx',
      description: 'alpha desc',
      public: true,
      props: [],
      // points at a file the readFile callback can't resolve → warning
      usageDoc: 'src/domain/alpha/USAGE.md',
    },
    {
      name: 'Secret',
      path: 'src/primitives/secret/Secret.tsx',
      description: 'internal only',
      public: false,
      props: [],
    },
  ],
  hooks: [
    {
      name: 'useZeta',
      path: 'src/hooks/useZeta.ts',
      description: 'zeta hook',
      signature: '() => void',
      public: true,
    },
    {
      name: 'useInternal',
      path: 'src/hooks/useInternal.ts',
      description: 'internal hook',
      signature: '() => void',
      public: false,
    },
  ],
})

/** react-adapter hooks — intentionally unsorted; `useZeta` clashes with the devkit hook. */
const adapterHooks = (): AdapterHook[] => [
  {
    name: 'useGamma',
    description: 'gamma adapter hook',
    category: 'store',
    signature: '() => Gamma',
    requiresProvider: true,
    file: 'src/hooks/useGamma.ts',
  },
  {
    name: 'useAlphaHook',
    description: 'alpha adapter hook',
    category: 'utility',
    signature: '() => void',
    requiresProvider: false,
    file: 'src/hooks/useAlphaHook.ts',
  },
  // collides with the devkit `useZeta` → dropped with a warning
  {
    name: 'useZeta',
    description: 'duplicate from adapter',
    category: 'store',
    signature: '() => void',
    requiresProvider: true,
    file: 'src/hooks/useZeta.ts',
  },
]

const coreStores = (): CoreStore[] => [
  {
    name: 'betaStore',
    category: 'devices',
    description: 'beta store',
    factory: 'createBetaStore',
    // unsorted to assert deterministic field ordering
    state: [
      { name: 'zValue', signature: 'number' },
      { name: 'aValue', signature: 'string' },
    ],
    actions: [{ name: 'reset', signature: '() => void' }],
    file: 'src/stores/beta.ts',
  },
  {
    name: 'alphaStore',
    category: 'auth',
    description: 'alpha store',
    factory: 'createAlphaStore',
    state: [],
    actions: [],
    file: 'src/stores/alpha.ts',
  },
]

const queryHelpers = (): CoreQueryHelper[] => [
  {
    name: 'zetaQuery',
    // absolute import path injected by the TS type printer — must be sanitised
    signature: '(p: import("/abs/mdk-prv/ui/packages/ui-foundation/src/types").Foo) => Query',
    description: 'zeta query helper',
    category: 'devices',
    file: 'src/queries/zeta.ts',
  },
  {
    name: 'alphaQuery',
    signature: '() => Query',
    description: 'alpha query helper',
    category: 'auth',
    file: 'src/queries/alpha.ts',
  },
]

/** Resolve the known on-disk pointers; everything else is "missing". */
const readFile = (relPath: string): string | null => {
  const table: Record<string, string> = {
    'src/primitives/bravo/USAGE.md': '# Bravo\n\nUse it.',
    'src/primitives/bravo/one.tsx': 'export const One = 1',
    'src/primitives/bravo/two.tsx': 'export const Two = 2',
  }
  return table[relPath] ?? null
}

const build = (includeInternal = false) =>
  buildDataset({
    registry: makeRegistry(),
    versionLabel: '0.2.0',
    generatedAt: '2020-01-01T00:00:00.000Z',
    includeInternal,
    readFile,
    cliManifest: '{"name":"mdk-ui"}',
    adapterHooks: adapterHooks(),
    coreStores: coreStores(),
    queryHelpers: queryHelpers(),
  })

describe('buildDataset', () => {
  it('filters internal entries and sorts by name', () => {
    const ds = build()
    expect(ds.components.map((c) => c.name)).toEqual(['Alpha', 'Bravo'])
    // devkit `useZeta` + adapter `useAlphaHook`/`useGamma` (adapter `useZeta` dropped as a dupe)
    expect(ds.hooks.map((h) => h.name)).toEqual(['useAlphaHook', 'useGamma', 'useZeta'])
  })

  it('includes internal entries when asked', () => {
    const ds = build(true)
    expect(ds.components.map((c) => c.name)).toEqual(['Alpha', 'Bravo', 'Secret'])
    expect(ds.hooks.map((h) => h.name)).toEqual(['useAlphaHook', 'useGamma', 'useInternal', 'useZeta'])
  })

  it('prefers the full description and derives the sub-package from the path', () => {
    const bravo = build().components.find((c) => c.name === 'Bravo')!
    expect(bravo.description).toBe('the full, untruncated description')
    expect(bravo.subpackage).toBe('primitives')
    expect(build().components.find((c) => c.name === 'Alpha')!.subpackage).toBe('domain')
  })

  it('carries prop default + description and a deterministic prop list', () => {
    const bravo = build().components.find((c) => c.name === 'Bravo')!
    expect(bravo.props).toEqual([
      { name: 'value', type: 'string', required: true, default: '"x"', description: 'the value prop' },
      { name: 'flag', type: 'boolean', required: false },
    ])
  })

  it('resolves usage + examples to dataset-relative files, sorted', () => {
    const ds = build()
    const bravo = ds.components.find((c) => c.name === 'Bravo')!
    expect(bravo.usageFile).toBe('usage/Bravo.md')
    expect(bravo.exampleFiles).toEqual(['examples/Bravo/one.tsx.txt', 'examples/Bravo/two.tsx.txt'])
    expect(ds.files.get('usage/Bravo.md')).toBe('# Bravo\n\nUse it.\n')
    expect(ds.files.get('examples/Bravo/one.tsx.txt')).toBe('export const One = 1\n')
  })

  it('warns about pointers it cannot read and leaves them off the record', () => {
    const ds = build()
    const alpha = ds.components.find((c) => c.name === 'Alpha')!
    expect(alpha.usageFile).toBeUndefined()
    expect(ds.warnings.some((w) => w.includes('Alpha') && w.includes('USAGE.md'))).toBe(true)
  })

  it('stamps provenance + counts and embeds the cli manifest', () => {
    const ds = build()
    expect(ds.meta.generatedFrom).toMatchObject({
      package: '@tetherto/test-devkit',
      packageVersion: '9.9.9',
      registrySchema: '1.4.0',
      gitSha: 'abc123',
      generatedAt: '2020-01-01T00:00:00.000Z',
    })
    expect(ds.meta.counts).toEqual({
      components: 2,
      hooks: 3,
      stores: 2,
      queryHelpers: 2,
      usageDocs: 1,
      examples: 2,
    })
    expect(ds.meta.schemaVersion).toBe('2.0.0')
    expect(ds.files.get('cli.json')).toBe('{"name":"mdk-ui"}\n')
  })
})

describe('buildDataset — adapter hooks + core stores', () => {
  it('merges adapter hooks into the hook catalog, tagged by package, sorted', () => {
    const ds = build()
    const byName = new Map(ds.hooks.map((h) => [h.name, h]))
    expect(byName.get('useZeta')!.package).toBe('react-devkit')
    expect(byName.get('useGamma')!.package).toBe('react-adapter')
    expect(byName.get('useGamma')!.requiresProvider).toBe(true)
    expect(byName.get('useAlphaHook')!.requiresProvider).toBe(false)
    expect(byName.get('useGamma')!.signature).toBe('() => Gamma')
  })

  it('drops an adapter hook that collides with a devkit hook and warns', () => {
    const ds = build()
    expect(ds.hooks.filter((h) => h.name === 'useZeta')).toHaveLength(1)
    expect(ds.warnings.some((w) => w.includes('useZeta') && w.includes('collides'))).toBe(true)
  })

  it('builds the store + query-helper catalog, sorted with sorted fields', () => {
    const ds = build()
    expect(ds.stores.map((s) => s.name)).toEqual(['alphaStore', 'betaStore'])
    const beta = ds.stores.find((s) => s.name === 'betaStore')!
    expect(beta.factory).toBe('createBetaStore')
    expect(beta.sourcePath).toBe('src/stores/beta.ts')
    expect(beta.state.map((f) => f.name)).toEqual(['aValue', 'zValue'])
    expect(beta.actions).toEqual([{ name: 'reset', signature: '() => void' }])
    expect(ds.queryHelpers.map((q) => q.name)).toEqual(['alphaQuery', 'zetaQuery'])
    expect(ds.queryHelpers.find((q) => q.name === 'zetaQuery')!.sourcePath).toBe('src/queries/zeta.ts')
  })

  it('strips absolute `import("…")` paths out of signatures (portable + leak-safe)', () => {
    const zeta = build().queryHelpers.find((q) => q.name === 'zetaQuery')!
    expect(zeta.signature).toBe('(p: Foo) => Query')
    expect(zeta.signature).not.toContain('import(')
    expect(zeta.signature).not.toContain('mdk-prv')
  })

  it('serialises stores + query helpers into stores.json', () => {
    const files = datasetToFiles(build())
    const storesJson = JSON.parse(files.get('stores.json')!) as {
      stores: Array<{ name: string }>
      queryHelpers: Array<{ name: string }>
    }
    expect(storesJson.stores.map((s) => s.name)).toEqual(['alphaStore', 'betaStore'])
    expect(storesJson.queryHelpers.map((q) => q.name)).toEqual(['alphaQuery', 'zetaQuery'])
  })
})

describe('serializeJson + datasetToFiles', () => {
  it('serialises with 2-space indent and a trailing newline', () => {
    expect(serializeJson({ a: 1 })).toBe('{\n  "a": 1\n}\n')
  })

  it('flattens catalogs + aux files (meta/README added by the caller)', () => {
    const files = datasetToFiles(build())
    expect(files.has('components.json')).toBe(true)
    expect(files.has('hooks.json')).toBe(true)
    expect(files.has('stores.json')).toBe(true)
    expect(files.has('usage/Bravo.md')).toBe(true)
    expect(files.has('cli.json')).toBe(true)
    expect(files.has('meta.json')).toBe(false)
    expect(files.has('README.md')).toBe(false)
  })
})

describe('diffCatalog', () => {
  type Row = { name: string; v: number }
  it('reports added / removed / field-level changes by name', () => {
    const oldArr: Row[] = [
      { name: 'A', v: 1 },
      { name: 'B', v: 2 },
    ]
    const newArr: Row[] = [
      { name: 'A', v: 1 },
      { name: 'B', v: 3 },
      { name: 'C', v: 9 },
    ]
    expect(diffCatalog(oldArr, newArr)).toEqual({
      added: ['C'],
      removed: [],
      changed: [{ name: 'B', fields: ['v'] }],
    })
  })
})

describe('diffFiles', () => {
  it('byte-compares two file maps', () => {
    const oldF = new Map([
      ['keep', 'same'],
      ['gone', 'x'],
      ['edit', 'a'],
    ])
    const newF = new Map([
      ['keep', 'same'],
      ['edit', 'b'],
      ['fresh', 'y'],
    ])
    expect(diffFiles(oldF, newF)).toEqual({ added: ['fresh'], removed: ['gone'], modified: ['edit'] })
  })
})

describe('computeDrift', () => {
  it('is clean against its own freshly-built output', () => {
    const ds = build()
    const drift = computeDrift(ds, ds.components, ds.hooks, ds.files, ds.stores, ds.queryHelpers)
    expect(drift.hasDrift).toBe(false)
  })

  it('flags drift when the committed catalog diverges', () => {
    const ds = build()
    const stale: DocsComponentRecord[] = ds.components.filter((c) => c.name !== 'Bravo')
    const staleHooks: DocsHookRecord[] = ds.hooks
    const drift = computeDrift(ds, stale, staleHooks, ds.files, ds.stores, ds.queryHelpers)
    expect(drift.hasDrift).toBe(true)
    expect(drift.components.added).toContain('Bravo')
  })

  it('flags drift when the committed store catalog diverges', () => {
    const ds = build()
    const staleStores = ds.stores.filter((s) => s.name !== 'betaStore')
    const drift = computeDrift(ds, ds.components, ds.hooks, ds.files, staleStores, ds.queryHelpers)
    expect(drift.hasDrift).toBe(true)
    expect(drift.stores.added).toContain('betaStore')
  })

  it('flags drift when only the utilities catalog diverges', () => {
    // Utilities ride inside stores.json, which is excluded from the file diff —
    // so a utilities-only change must be caught by the catalog diff or it slips
    // past --report-only entirely.
    const ds = build()
    const withUtil: DocsDataset = {
      ...ds,
      utilities: [
        {
          name: 'formatHashrate',
          kind: 'function',
          category: 'format',
          description: 'Format a hashrate.',
          signature: '(v: number) => string',
          sourcePath: 'src/utils/formatHashrate.ts',
        },
      ],
    }
    // Committed tree had no utilities → the new util must register as drift.
    const drift = computeDrift(
      withUtil,
      withUtil.components,
      withUtil.hooks,
      withUtil.files,
      withUtil.stores,
      withUtil.queryHelpers,
      [],
    )
    expect(drift.hasDrift).toBe(true)
    expect(drift.utilities.added).toContain('formatHashrate')
  })
})

describe('buildDataset edge cases', () => {
  it('classifies non-core/foundation paths as "other", warns on missing examples, and embeds fonts', () => {
    const ds = buildDataset({
      registry: {
        version: '1.4.0',
        package: '@tetherto/test-devkit',
        packageVersion: '1.0.0',
        generatedAt: '2020-01-01T00:00:00.000Z',
        generatedFrom: { gitSha: 'abc' },
        components: [
          {
            name: 'Misc',
            path: 'src/misc/Misc.tsx',
            description: 'a misc component',
            public: true,
            props: [],
            examples: ['src/misc/missing.tsx'],
          },
        ],
        hooks: [],
      },
      versionLabel: '0.2.0',
      generatedAt: '2020-01-01T00:00:00.000Z',
      includeInternal: false,
      readFile: () => null, // example pointer can't be resolved → warning
      adapterHooks: [],
      coreStores: [],
      queryHelpers: [],
      fonts: {
        package: '@tetherto/mdk-fonts',
        packageVersion: '1.0.0',
        description: 'Fonts.',
        imports: ['@tetherto/mdk-fonts/x.css'],
        assets: [{ weight: 'Bold', file: 'B.woff2' }],
      },
    })
    expect(ds.components[0]!.subpackage).toBe('other')
    expect(ds.warnings.some((w) => w.includes('Example pointer') && w.includes('Misc'))).toBe(true)
    expect(ds.fonts).toMatchObject({ package: '@tetherto/mdk-fonts', imports: ['@tetherto/mdk-fonts/x.css'] })
  })
})

describe('stripUsageLinks', () => {
  it('drops links targeting a source-tree USAGE.md but keeps the text', () => {
    expect(stripUsageLinks('See [`Foo`](../foo/USAGE.md).')).toBe('See `Foo`.')
    expect(stripUsageLinks('[Bar](../bar/USAGE.md#anchor) x')).toBe('Bar x')
  })

  it('leaves other links untouched', () => {
    const md = 'See [docs](/v0-4-0/reference/ui-kit) and [ext](https://example.com).'
    expect(stripUsageLinks(md)).toBe(md)
  })
})
