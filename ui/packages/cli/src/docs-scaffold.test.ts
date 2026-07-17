import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { DocsDataset } from './docs-data.js'
import { buildUiNav, GENERATED_MARKER, registerRenderers, scaffoldDocs } from './docs-scaffold.js'
import { noop } from './test-utils.js'

// Generated reference lives under the versioned reference root (test uses 0.3.0).
const ui = (...parts: string[]): string => join('content', 'docs', 'v0-3-0', 'reference', 'ui-kit', ...parts)

/** A small, controlled dataset covering every surface the scaffolder handles. */
const makeDataset = (overrides: Partial<DocsDataset> = {}): DocsDataset => ({
  meta: {
    schemaVersion: '1.2.0',
    versionLabel: '0.3.0',
    generatedFrom: {
      package: '@tetherto/mdk-react-devkit',
      packageVersion: '0.0.1',
      registrySchema: '1.4.0',
      gitSha: 'abc',
      generatedAt: '2020-01-01T00:00:00.000Z',
    },
    counts: { components: 0, hooks: 0, stores: 0, queryHelpers: 0, usageDocs: 0, examples: 0 },
  },
  components: [
    { name: 'Button', subpackage: 'primitives', category: 'forms', description: 'A button.', props: [], sourcePath: 'src/primitives/forms/Button/index.tsx' },
    { name: 'Dialog', subpackage: 'primitives', category: 'dialogs', description: 'A dialog.', props: [], sourcePath: 'src/primitives/dialogs/Dialog/index.tsx' },
    { name: 'MinerCard', subpackage: 'domain', category: 'cards', description: 'A miner card.', props: [], sourcePath: 'src/domain/cards/MinerCard/index.tsx' },
  ],
  hooks: [
    { name: 'useAuth', package: 'react-adapter', description: 'Auth hook.', signature: '() => Auth', requiresProvider: true },
    { name: 'useMinerData', package: 'react-devkit', description: 'Miner data.', signature: '() => Data' },
  ],
  stores: [
    { name: 'authStore', category: 'auth', description: 'Auth store.', factory: 'createAuthStore', state: [], actions: [], sourcePath: 'src/stores/auth.ts' },
  ],
  queryHelpers: [
    { name: 'minerQuery', category: 'queries', description: 'Miner query.', signature: '() => Query', sourcePath: 'src/queries/miner.ts' },
  ],
  utilities: [
    { name: 'ONE_DAY_MS', kind: 'constant', category: 'alerts', description: 'A day in ms.', signature: 'number', sourcePath: 'src/utils/time.ts' },
    { name: 'formatHashrate', kind: 'function', category: 'format', description: 'Format a hashrate.', signature: '(n: number) => string', sourcePath: 'src/utils/format.ts' },
  ],
  fonts: { package: '@tetherto/mdk-fonts', packageVersion: '0.0.1', description: 'Fonts.', imports: ['@tetherto/mdk-fonts/jetbrains-mono.css'], assets: [{ weight: 'Bold', file: 'JetBrainsMono-Bold.woff2' }] },
  files: new Map(),
  warnings: [],
  ...overrides,
})

const MDX_COMPONENTS = `import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    ...components,
  };
}
`

describe('scaffoldDocs', () => {
  let repo: string
  beforeEach(() => {
    repo = mkdtempSync(join(tmpdir(), 'mdk-scaffold-'))
    mkdirSync(join(repo, 'src'), { recursive: true })
    writeFileSync(join(repo, 'src', 'mdx-components.tsx'), MDX_COMPONENTS, 'utf8')
  })
  afterEach(() => rmSync(repo, { recursive: true, force: true }))

  const run = (ds: DocsDataset) =>
    scaffoldDocs({ docsRepo: repo, versionLabel: '0.3.0', dataset: ds, out: noop })

  it('creates a marker-guarded page per component, grouped by package + subpackage + category', () => {
    run(makeDataset())
    const button = join(repo, ui('react-devkit', 'components', 'primitives', 'forms', 'Button.mdx'))
    expect(existsSync(button)).toBe(true)
    const text = readFileSync(button, 'utf8')
    expect(text).toContain(GENERATED_MARKER)
    expect(text).toContain('<ComponentDoc name="Button" />')
    expect(text).toContain('title: Button')
    expect(existsSync(join(repo, ui('react-devkit', 'components', 'primitives', 'dialogs', 'Dialog.mdx')))).toBe(true)
    expect(existsSync(join(repo, ui('react-devkit', 'components', 'domain', 'cards', 'MinerCard.mdx')))).toBe(true)
  })

  it('covers hooks, stores, query helpers, utilities, constants, and fonts — grouped by package', () => {
    run(makeDataset())
    expect(existsSync(join(repo, ui('react-adapter', 'hooks', 'useAuth.mdx')))).toBe(true)
    expect(existsSync(join(repo, ui('react-devkit', 'hooks', 'useMinerData.mdx')))).toBe(true)
    expect(existsSync(join(repo, ui('ui-foundation', 'stores', 'authStore.mdx')))).toBe(true)
    expect(existsSync(join(repo, ui('ui-foundation', 'query-helpers.mdx')))).toBe(true)
    expect(existsSync(join(repo, ui('ui-foundation', 'utilities.mdx')))).toBe(true)
    expect(existsSync(join(repo, ui('ui-foundation', 'constants.mdx')))).toBe(true)
    expect(existsSync(join(repo, ui('fonts.mdx')))).toBe(true)
  })

  it('sanitizes MDX-hazard chars and caps long generated descriptions', () => {
    const long = `Renders <HeaderBox /> from { readonly a: 1 } config. ${'x'.repeat(200)}`
    run(makeDataset({
      components: [{ name: 'Big', subpackage: 'primitives', category: 'forms', description: long, props: [], sourcePath: 'src/primitives/forms/Big/index.tsx' }],
    }))
    const page = readFileSync(join(repo, ui('react-devkit', 'components', 'primitives', 'forms', 'Big.mdx')), 'utf8')
    const descLine = page.split('\n').find((l) => l.startsWith('description:'))!
    // No JSX/expression punctuation survives in the frontmatter description…
    expect(descLine).not.toMatch(/[<{}]/)
    // …the component name is kept, and the long value is truncated.
    expect(descLine).toContain('HeaderBox')
    expect(descLine).toContain('…')
  })

  it('registers the UtilitiesDoc renderer', () => {
    run(makeDataset())
    const src = readFileSync(join(repo, 'src', 'mdx-components.tsx'), 'utf8')
    expect(src).toContain('import { UtilitiesDoc } from "@/components/utilities-doc";')
  })

  it('writes active-version.ts matching the version label', () => {
    run(makeDataset())
    const v = readFileSync(join(repo, 'src', 'data', 'active-version.ts'), 'utf8')
    expect(v).toContain('export const ACTIVE_DOCS_VERSION = "0.3.0";')
  })

  it('creates nav meta.json with the "..." rest entry so pages auto-list', () => {
    run(makeDataset())
    const meta = JSON.parse(readFileSync(join(repo, ui('react-devkit', 'components', 'primitives', 'forms', 'meta.json')), 'utf8'))
    expect(meta.pages).toContain('...')
  })

  it('patches an existing hand-written meta.json without losing its entries', () => {
    const folder = join(repo, ui('react-devkit', 'components', 'primitives', 'forms'))
    mkdirSync(folder, { recursive: true })
    writeFileSync(join(folder, 'meta.json'), JSON.stringify({ title: 'Forms', pages: ['index', 'composition'] }, null, 2), 'utf8')
    const result = run(makeDataset())
    const meta = JSON.parse(readFileSync(join(folder, 'meta.json'), 'utf8'))
    expect(meta.pages).toEqual(['index', 'composition', '...'])
    expect(result.patched).toContain(ui('react-devkit', 'components', 'primitives', 'forms', 'meta.json'))
  })

  it('registers the rendering components in mdx-components.tsx', () => {
    run(makeDataset())
    const src = readFileSync(join(repo, 'src', 'mdx-components.tsx'), 'utf8')
    expect(src).toContain('import { ComponentDoc } from "@/components/component-doc";')
    expect(src).toContain('import { FontsDoc } from "@/components/fonts-doc";')
    expect(src).toContain('...mdkGeneratedComponents,')
  })

  it('is idempotent: a second run changes nothing', () => {
    run(makeDataset())
    const second = run(makeDataset())
    expect(second.created).toHaveLength(0)
    expect(second.updated).toHaveLength(0)
    expect(second.deleted).toHaveLength(0)
    // Registration is not duplicated.
    const src = readFileSync(join(repo, 'src', 'mdx-components.tsx'), 'utf8')
    expect(src.match(/mdkGeneratedComponents =/g)).toHaveLength(1)
    expect(src.match(/\.\.\.mdkGeneratedComponents,/g)).toHaveLength(1)
  })

  it('prunes a page when its component is removed from the dataset', () => {
    run(makeDataset())
    const dialog = join(repo, ui('react-devkit', 'components', 'primitives', 'dialogs', 'Dialog.mdx'))
    expect(existsSync(dialog)).toBe(true)

    const trimmed = makeDataset({
      components: makeDataset().components.filter((c) => c.name !== 'Dialog'),
    })
    const result = run(trimmed)
    expect(existsSync(dialog)).toBe(false)
    expect(result.deleted).toContain(ui('react-devkit', 'components', 'primitives', 'dialogs', 'Dialog.mdx'))
  })

  it('tolerates a corrupt previous manifest (treats it as no prior run)', () => {
    mkdirSync(join(repo, 'src', 'data'), { recursive: true })
    writeFileSync(join(repo, 'src', 'data', 'scaffold-manifest.json'), '{ not valid json', 'utf8')
    expect(() => run(makeDataset())).not.toThrow()
    expect(existsSync(join(repo, ui('react-devkit', 'components', 'primitives', 'forms', 'Button.mdx')))).toBe(true)
  })

  it('refuses to overwrite a hand-written page of the same name', () => {
    const folder = join(repo, ui('react-devkit', 'components', 'primitives', 'forms'))
    mkdirSync(folder, { recursive: true })
    const handwritten = join(folder, 'Button.mdx')
    writeFileSync(handwritten, '# Hand written, no marker\n', 'utf8')
    const result = run(makeDataset())
    expect(readFileSync(handwritten, 'utf8')).toBe('# Hand written, no marker\n')
    expect(result.skipped).toContain(ui('react-devkit', 'components', 'primitives', 'forms', 'Button.mdx'))
  })
})

describe('buildUiNav', () => {
  const names = (nodes: Array<{ name: unknown }>): unknown[] => nodes.map((n) => n.name)

  it('groups by package and nests components by subpackage → category', () => {
    const nav = buildUiNav(makeDataset(), '0.4.0') as Array<{ name: string; children?: any[] }>
    expect(names(nav)).toEqual(['react-devkit', 'react-adapter', 'ui-foundation', 'Fonts'])

    const devkit = nav.find((n) => n.name === 'react-devkit')!
    expect(names(devkit.children!)).toEqual(['Components', 'Hooks'])
    const components = devkit.children!.find((c: any) => c.name === 'Components')
    expect(names(components.children)).toEqual(['Primitives', 'Domain'])
    const core = components.children.find((c: any) => c.name === 'Primitives')
    // Button lives under Core → Forms with the versioned URL.
    const forms = core.children.find((c: any) => c.name === 'Forms')
    expect(forms.children[0]).toMatchObject({
      type: 'page',
      name: 'Button',
      url: '/v0-4-0/reference/ui-kit/react-devkit/components/primitives/forms/Button',
    })

    const core2 = nav.find((n) => n.name === 'ui-foundation')!
    expect(names(core2.children!)).toEqual(['Stores', 'Query helpers', 'Utilities', 'Constants'])
  })

  it('omits empty groups entirely', () => {
    const empty = buildUiNav(
      makeDataset({ components: [], hooks: [], stores: [], queryHelpers: [], utilities: [], fonts: undefined }),
      '0.4.0',
    )
    expect(empty).toEqual([])
  })

  it('emits only non-empty package groups (adapter-only + constants-only)', () => {
    const nav = buildUiNav(
      makeDataset({
        components: [],
        hooks: [{ name: 'useAuth', package: 'react-adapter', description: 'x', signature: '() => A', requiresProvider: true }],
        stores: [],
        queryHelpers: [],
        utilities: [{ name: 'FOO', kind: 'constant', category: 'a', description: '', signature: 'number', sourcePath: 's' }],
        fonts: undefined,
      }),
      '0.4.0',
    ) as Array<{ name: string; children?: any[] }>
    expect(names(nav)).toEqual(['react-adapter', 'ui-foundation'])
    expect(names(nav.find((n) => n.name === 'ui-foundation')!.children!)).toEqual(['Constants'])
  })

  it('nests devkit hooks-only and query-helpers + utilities ui-foundation', () => {
    const nav = buildUiNav(
      makeDataset({
        components: [],
        hooks: [{ name: 'useX', package: 'react-devkit', description: 'x', signature: '() => X' }],
        stores: [],
        queryHelpers: [{ name: 'q', category: 'c', description: '', signature: '() => Q', sourcePath: 's' }],
        utilities: [{ name: 'fn', kind: 'function', category: 'a', description: '', signature: '() => v', sourcePath: 's' }],
        fonts: undefined,
      }),
      '0.4.0',
    ) as Array<{ name: string; children?: any[] }>
    expect(names(nav)).toEqual(['react-devkit', 'ui-foundation'])
    // Only Hooks under react-devkit (no Components — none present).
    expect(names(nav.find((n) => n.name === 'react-devkit')!.children!)).toEqual(['Hooks'])
    expect(names(nav.find((n) => n.name === 'ui-foundation')!.children!)).toEqual(['Query helpers', 'Utilities'])
  })
})

describe('registerRenderers', () => {
  let repo: string
  beforeEach(() => {
    repo = mkdtempSync(join(tmpdir(), 'mdk-register-'))
    mkdirSync(join(repo, 'src'), { recursive: true })
  })
  afterEach(() => rmSync(repo, { recursive: true, force: true }))

  it('returns false and warns when mdx-components.tsx is missing', () => {
    expect(registerRenderers(repo, noop)).toBe(false)
  })

  it('returns false when the components-map anchor is missing', () => {
    writeFileSync(
      join(repo, 'src', 'mdx-components.tsx'),
      'export function getMDXComponents(c) { return { ...c }; }\n',
      'utf8',
    )
    expect(registerRenderers(repo, noop)).toBe(false)
  })

  it('does not split a multi-line import when registering (regression)', () => {
    const src = `import a from 'a';
import {
  Foo,
  Bar,
} from '@/components/landing';

export function getMDXComponents(components) {
  return { ...defaultMdxComponents, ...components };
}
`
    writeFileSync(join(repo, 'src', 'mdx-components.tsx'), src, 'utf8')
    expect(registerRenderers(repo, noop)).toBe(true)
    const out = readFileSync(join(repo, 'src', 'mdx-components.tsx'), 'utf8')
    // The multi-line import must stay intact (no marker block injected inside it).
    expect(out).toContain('import {\n  Foo,\n  Bar,\n} from \'@/components/landing\';')
    expect(out).toContain('...mdkGeneratedComponents,')
    // Every generated import line is followed by another import or the const — never broken.
    expect(out).toContain('import { ComponentDoc } from "@/components/component-doc";')
  })
})
