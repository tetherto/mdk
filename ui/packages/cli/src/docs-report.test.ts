import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { CoverageReport } from './docs-coverage.js'
import type { DocsDataset, DriftReport } from './docs-data.js'
import { buildReportData, renderHtml, renderMarkdown, writeSyncReport } from './docs-report.js'

const dataset = (): DocsDataset => ({
  meta: {
    schemaVersion: '1.2.0',
    versionLabel: '0.3.0',
    generatedFrom: {
      package: '@tetherto/mdk-react-devkit',
      packageVersion: '0.0.1',
      registrySchema: '1.4.0',
      gitSha: 'deadbeef',
      generatedAt: '2020-01-01T00:00:00.000Z',
    },
    counts: { components: 0, hooks: 0, stores: 0, queryHelpers: 0, usageDocs: 0, examples: 0 },
  },
  components: [
    { name: 'Button', subpackage: 'primitives', tier: 'agent-ready', category: 'forms', description: 'A button.', props: [], usageFile: 'usage/Button.md', exampleFiles: ['examples/Button/a.tsx.txt'], sourcePath: 'src/primitives/forms/Button/index.tsx' },
    { name: 'Sparse', subpackage: 'primitives', tier: 'agent-ready', category: 'misc', description: 'No docs.', props: [], sourcePath: 'src/primitives/misc/Sparse/index.tsx' },
    // Advanced tier is reference-only by design (no USAGE.md/examples required),
    // so it must never be flagged as sparse even though it ships no docs.
    { name: 'AdvancedPart', subpackage: 'domain', tier: 'advanced', category: 'misc', description: 'Reference-only.', props: [], sourcePath: 'src/domain/misc/AdvancedPart/index.tsx' },
  ],
  hooks: [{ name: 'useAuth', package: 'react-adapter', description: 'Auth.', signature: '() => A' }],
  stores: [],
  queryHelpers: [],
  utilities: [],
  fonts: null,
  files: new Map(),
  warnings: [],
})

const drift = (): DriftReport => ({
  hasDrift: true,
  components: {
    added: ['Button'],
    removed: ['OldCard'],
    changed: [{ name: 'Sparse', fields: ['props'] }],
  },
  hooks: { added: ['useAuth'], removed: [], changed: [] },
  stores: { added: [], removed: [], changed: [] },
  queryHelpers: { added: [], removed: [], changed: [] },
  utilities: { added: [], removed: [], changed: [] },
  files: { added: [], removed: [], modified: [] },
})

const coverage: CoverageReport = {
  newComponents: ['Button'],
  removedComponents: ['OldCard'],
  newHooks: [],
  clean: false,
}

describe('docs-report', () => {
  let repo: string
  beforeEach(() => {
    repo = mkdtempSync(join(tmpdir(), 'mdk-report-'))
  })
  afterEach(() => rmSync(repo, { recursive: true, force: true }))

  const input = () => ({ dataset: dataset(), drift: drift(), coverage, docsRepo: repo })

  it('summarises new / changed / removed across surfaces', () => {
    const d = buildReportData(input())
    expect(d.newComponents.map((e) => e.name)).toEqual(['Button'])
    expect(d.newComponents[0]!.page).toBe('content/docs/v0-3-0/reference/ui-kit/react-devkit/components/primitives/forms/Button.mdx')
    expect(d.newHooks.map((e) => e.name)).toEqual(['useAuth'])
    expect(d.changedComponents[0]).toMatchObject({ name: 'Sparse', fields: ['props'] })
    expect(d.removedComponents.map((e) => e.name)).toEqual(['OldCard'])
  })

  it('flags sparse pages missing usage/examples, but only agent-ready ones', () => {
    const d = buildReportData(input())
    // `Sparse` is agent-ready (docs required) → flagged; `AdvancedPart` is
    // advanced (reference-only by design) → never flagged despite shipping no docs.
    expect(d.thinPages.map((t) => t.name)).toEqual(['Sparse'])
    expect(d.thinPages[0]!.reason).toContain('no USAGE.md')
  })

  it('scans hand-written pages for lingering references to removed names', () => {
    const dir = join(repo, 'content', 'docs', 'ui', 'core')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'overview.mdx'), 'See <ComponentDoc name="OldCard" /> here.\n', 'utf8')
    // A generated page referencing it must be ignored (it carries the marker).
    writeFileSync(join(dir, 'gen.mdx'), '{/* mdk:generated */}\n<ComponentDoc name="OldCard" />\n', 'utf8')

    const d = buildReportData(input())
    const oldCard = d.removedComponents.find((e) => e.name === 'OldCard')!
    expect(oldCard.references).toEqual(['content/docs/ui/core/overview.mdx'])
  })

  it('renders deterministic HTML + Markdown (byte-identical across runs)', () => {
    const a = writeSyncReport(input())
    const htmlA = readFileSync(a.htmlPath, 'utf8')
    const mdA = readFileSync(a.mdPath, 'utf8')
    const b = writeSyncReport(input())
    expect(readFileSync(b.htmlPath, 'utf8')).toBe(htmlA)
    expect(readFileSync(b.mdPath, 'utf8')).toBe(mdA)
  })

  it('produces a self-contained HTML page with no external assets', () => {
    const html = renderHtml(buildReportData(input()))
    expect(html.startsWith('<!doctype html>')).toBe(true)
    expect(html).toContain('<style>')
    expect(html).not.toMatch(/<link[^>]+href=|<script[^>]+src=/)
    expect(html).toContain('Where to focus')
  })

  it('markdown lists the focus checklist and changed fields', () => {
    const md = renderMarkdown(buildReportData(input()))
    expect(md).toContain('# MDK docs sync report')
    expect(md).toContain('Where to focus')
    expect(md).toContain('**Sparse** (`props`)')
  })

  it('reports removed hooks and name collisions in HTML + Markdown', () => {
    const customDrift = { ...drift(), hooks: { added: [], removed: ['useOld'], changed: [] } }
    const scaffold = {
      created: [],
      updated: [],
      unchanged: [],
      deleted: [],
      patched: [],
      skipped: ['content/docs/v0-3-0/reference/ui-kit/react-devkit/hooks/useOld.mdx'],
    }
    // A lingering hand-written reference to the removed hook is surfaced.
    const dir = join(repo, 'content', 'docs')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'legacy.mdx'), 'Still uses <HookDoc name="useOld" /> here.\n', 'utf8')

    const d = buildReportData({ dataset: dataset(), drift: customDrift, coverage, docsRepo: repo, scaffold })
    expect(d.removedHooks.map((e) => e.name)).toEqual(['useOld'])
    expect(d.removedHooks[0]!.references).toEqual(['content/docs/legacy.mdx'])
    expect(d.collisions).toEqual(['content/docs/v0-3-0/reference/ui-kit/react-devkit/hooks/useOld.mdx'])

    const html = renderHtml(d)
    expect(html).toContain('useOld.mdx')
    const md = renderMarkdown(d)
    expect(md).toContain('### Name collisions')
    expect(md).toContain('useOld.mdx')
  })
})
