import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'

import type { DocsDataset } from './docs-data.js'
import { DEVKIT_SUBPACKAGES, SUB_PACKAGE } from './docs-data.js'

/**
 * The "last mile" of `docs:build`: turn the generated dataset into live Fumadocs
 * MDX pages + navigation in a local mdk-docs checkout, so a brand-new component,
 * hook, store, or font flows through to a published page with no hand editing.
 *
 * Design:
 * - Every page the scaffolder writes carries {@link GENERATED_MARKER}; it only
 *   ever creates, overwrites, or deletes files bearing that marker (or tracked in
 *   the manifest). Hand-written narrative pages are never touched.
 * - Navigation uses Fumadocs' `"..."` rest operator: each folder's `meta.json`
 *   is ensured to contain `"..."`, so generated pages auto-list with zero
 *   per-page nav edits. Existing hand-curated `meta.json` entries are preserved.
 * - A manifest (`src/data/scaffold-manifest.json`) records the files the
 *   scaffolder owns, so removed surfaces get their pages pruned on the next run.
 * - The dataset path version is written once to `src/data/active-version.ts`,
 *   which the rendering components import — no hardcoded version segment.
 */

/** Marker on the first content line of every generated MDX page. */
export const GENERATED_MARKER =
  '{/* mdk:generated — do not edit by hand. Regenerate with `npm run docs:sync`. */}'

/** Rest-glob token Fumadocs expands to "all remaining pages in this folder". */
const REST = '...'

// Nav is organised by the package a symbol ships from, mirroring the monorepo's
// `packages/` layout. Components ship from react-devkit (split into its `primitives`
// and `domain` subpackages); hooks carry their own package (react-devkit or
// react-adapter); stores / query-helpers / utilities / constants ship from
// ui-foundation.
const PKG_DEVKIT = 'react-devkit'
const PKG_CORE = 'ui-foundation'

/** Version label (`0.4.0`) → docs folder segment (`v0-4-0`). */
export const versionFolder = (versionLabel: string): string => `v${versionLabel.replace(/\./g, '-')}`

/**
 * Repo-relative root the generated reference lives under, versioned so links stay
 * inside the matching per-version sidebar tree: `content/docs/v0-4-0/reference/ui-kit`.
 */
export const uiRootParts = (versionLabel: string): string[] => [
  'content',
  'docs',
  versionFolder(versionLabel),
  'reference',
  'ui-kit',
]

const uiBase = (versionLabel: string): string => uiRootParts(versionLabel).join('/')

/** Routable URL for a generated page relPath (strips `content/docs` + `.mdx`). */
export const pageUrl = (relPath: string): string => `/${relPath.replace(/^content\/docs\//, '').replace(/\.mdx$/, '')}`

/** POSIX repo-relative path of a component's generated page. */
export const componentPageRel = (
  c: { name: string; subpackage: string; category?: string },
  versionLabel: string,
): string =>
  `${uiBase(versionLabel)}/${PKG_DEVKIT}/components/${c.subpackage === SUB_PACKAGE.domain ? SUB_PACKAGE.domain : SUB_PACKAGE.primitives}/${c.category ?? 'misc'}/${c.name}.mdx`

/** POSIX repo-relative path of a hook's generated page. */
export const hookPageRel = (h: { name: string; package: string }, versionLabel: string): string =>
  `${uiBase(versionLabel)}/${h.package}/hooks/${h.name}.mdx`

/** POSIX repo-relative path of a store's generated page. */
export const storePageRel = (name: string, versionLabel: string): string =>
  `${uiBase(versionLabel)}/${PKG_CORE}/stores/${name}.mdx`

export type ScaffoldOptions = {
  /** Absolute path to the mdk-docs checkout. */
  docsRepo: string
  /** Version segment (matches `--version-label`); written to active-version.ts. */
  versionLabel: string
  /** The freshly-built dataset. */
  dataset: DocsDataset
  out?: (line: string) => void
}

export type ScaffoldResult = {
  created: string[]
  updated: string[]
  unchanged: string[]
  deleted: string[]
  /** Hand-written meta.json files we patched a `"..."` rest entry into. */
  patched: string[]
  /** Existing non-generated pages we refused to overwrite (name collisions). */
  skipped: string[]
}

type Manifest = {
  version: '1'
  versionLabel: string
  ownedFiles: string[]
  patchedMeta: string[]
}

// ─── Small helpers ───────────────────────────────────────────────────────────

const titleCase = (slug: string): string =>
  slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

/** Collapse a description to a single, YAML-safe, length-capped frontmatter scalar. */
const frontmatterDescription = (raw: string): string => {
  const oneLine = raw
    .replace(/\s+/g, ' ')
    .trim()
    // Drop MDX-special punctuation so the description is plain text: MDX parses
    // `<…>` as JSX and `{…}` as a JS expression and fails the page (a truncated
    // tag or a `{ readonly … }` signature would break it). Peel tag punctuation
    // (`<`, `</`, `/>`, `>`) so `<Foo />` collapses to `Foo`, then remove any
    // stray brackets/braces (e.g. a tag truncated mid-name, or a raw `{`).
    .replace(/<\/?/g, '')
    .replace(/\s*\/?>/g, '')
    .replace(/[<>{}]/g, '')
  const capped = oneLine.length > 160 ? `${oneLine.slice(0, 157)}…` : oneLine
  return capped.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

const mdxPage = (title: string, description: string, body: string): string =>
  [
    '---',
    `title: ${title}`,
    `description: "${frontmatterDescription(description)}"`,
    '---',
    '',
    GENERATED_MARKER,
    '',
    body,
    '',
  ].join('\n')

const isGenerated = (abs: string): boolean =>
  existsSync(abs) && readFileSync(abs, 'utf8').includes(GENERATED_MARKER)

// ─── A staged write set (so we can diff & prune deterministically) ────────────

class Scaffolder {
  private readonly created: string[] = []
  private readonly updated: string[] = []
  private readonly unchanged: string[] = []
  private readonly deleted: string[] = []
  private readonly patched: string[] = []
  private readonly skipped: string[] = []
  /** relPaths (from docsRepo) of every file this run owns. */
  private readonly owned = new Set<string>()
  private readonly patchedSet = new Set<string>()

  constructor(
    private readonly repo: string,
    private readonly out: (line: string) => void,
    /** Files the previous run owned — drives ownership of pre-existing nav files. */
    private readonly previousOwned: Set<string>,
  ) {}

  private rel(abs: string): string {
    return relative(this.repo, abs).split('\\').join('/')
  }

  /** Write an owned file, recording create/update/unchanged. Tracks it for pruning. */
  writeOwned(abs: string, contents: string): void {
    const rel = this.rel(abs)
    this.owned.add(rel)
    const prev = existsSync(abs) ? readFileSync(abs, 'utf8') : null
    if (prev === contents) {
      this.unchanged.push(rel)
      return
    }
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, contents, 'utf8')
    ;(prev === null ? this.created : this.updated).push(rel)
  }

  /** Write a generated MDX page, refusing to clobber a hand-written file of the same name. */
  writePage(abs: string, contents: string): void {
    if (existsSync(abs) && !isGenerated(abs)) {
      this.skipped.push(this.rel(abs))
      this.out(`⚠ Skipped ${this.rel(abs)} — exists and is not scaffolder-generated.`)
      return
    }
    this.writeOwned(abs, contents)
  }

  /**
   * Ensure a folder's `meta.json` includes the `"..."` rest entry so generated
   * pages auto-list. Ownership is tracked via the manifest, not file content:
   *   - absent → create an owned meta.json;
   *   - we owned it last run → re-own it (rewrite preserving title, keeping REST);
   *   - hand-written → patch a `"..."` in (preserving title + order), never own it.
   */
  ensureRestNav(folderAbs: string, title?: string): void {
    const metaAbs = join(folderAbs, 'meta.json')
    const rel = this.rel(metaAbs)

    if (!existsSync(metaAbs)) {
      this.writeOwned(metaAbs, this.serializeNav(title, [REST]))
      return
    }

    let parsed: { title?: string; pages?: unknown[] }
    try {
      parsed = JSON.parse(readFileSync(metaAbs, 'utf8')) as { title?: string; pages?: unknown[] }
    } catch {
      this.out(`⚠ Could not parse ${this.rel(metaAbs)} — leaving nav untouched.`)
      return
    }
    const pages = Array.isArray(parsed.pages) ? parsed.pages : []

    if (this.previousOwned.has(rel)) {
      // Ours from a prior run — keep owning it (idempotent rewrite).
      const next = pages.includes(REST) ? pages : [...pages, REST]
      this.writeOwned(metaAbs, this.serializeNav(parsed.title ?? title, next))
      return
    }

    // Hand-written — patch in the rest entry, but never take ownership.
    if (pages.includes(REST)) return
    parsed.pages = [...pages, REST]
    writeFileSync(metaAbs, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8')
    this.patched.push(rel)
    this.patchedSet.add(rel)
  }

  private serializeNav(title: string | undefined, pages: unknown[]): string {
    const meta = title ? { title, pages } : { pages }
    return `${JSON.stringify(meta, null, 2)}\n`
  }

  /** Delete files the previous run owned that this run no longer produced. */
  prune(previous: Manifest | null): void {
    if (!previous) return
    for (const rel of previous.ownedFiles) {
      if (this.owned.has(rel)) continue
      const abs = join(this.repo, rel)
      if (existsSync(abs)) {
        rmSync(abs, { force: true })
        this.deleted.push(rel)
      }
    }
  }

  manifest(versionLabel: string): Manifest {
    return {
      version: '1',
      versionLabel,
      ownedFiles: [...this.owned].sort(),
      patchedMeta: [...this.patchedSet].sort(),
    }
  }

  result(): ScaffoldResult {
    const sort = (a: string[]): string[] => [...a].sort()
    return {
      created: sort(this.created),
      updated: sort(this.updated),
      unchanged: sort(this.unchanged),
      deleted: sort(this.deleted),
      patched: sort(this.patched),
      skipped: sort(this.skipped),
    }
  }
}

// ─── Manifest IO ──────────────────────────────────────────────────────────────

const manifestPath = (repo: string): string => join(repo, 'src', 'data', 'scaffold-manifest.json')

const readManifest = (repo: string): Manifest | null => {
  const p = manifestPath(repo)
  if (!existsSync(p)) return null
  try {
    return JSON.parse(readFileSync(p, 'utf8')) as Manifest
  } catch {
    return null
  }
}

// ─── mdx-components.tsx registration ──────────────────────────────────────────

/** Renderer name → installed component file (under src/components). */
const RENDERERS: Array<{ name: string; file: string }> = [
  { name: 'ComponentDoc', file: 'component-doc' },
  { name: 'PropsTable', file: 'props-table' },
  { name: 'HookDoc', file: 'hook-doc' },
  { name: 'StoreDoc', file: 'store-doc' },
  { name: 'QueryHelpersDoc', file: 'query-helpers-doc' },
  { name: 'UtilitiesDoc', file: 'utilities-doc' },
  { name: 'FontsDoc', file: 'fonts-doc' },
]

const IMPORTS_START = '// mdk:generated-imports:start'
const IMPORTS_END = '// mdk:generated-imports:end'
const MAP_START = '// mdk:generated-map:start'
const MAP_END = '// mdk:generated-map:end'

const buildImportsBlock = (): string =>
  [
    IMPORTS_START,
    ...RENDERERS.map((r) => `import { ${r.name} } from "@/components/${r.file}";`),
    `const mdkGeneratedComponents = { ${RENDERERS.map((r) => r.name).join(', ')} };`,
    IMPORTS_END,
  ].join('\n')

const replaceBlock = (src: string, start: string, end: string, block: string): string | null => {
  const s = src.indexOf(start)
  const e = src.indexOf(end)
  if (s === -1 || e === -1 || e < s) return null
  return `${src.slice(0, s)}${block}${src.slice(e + end.length)}`
}

/**
 * Idempotently register the rendering components in `src/mdx-components.tsx` so
 * the generated `<ComponentDoc>` / `<HookDoc>` / … tags resolve. Wraps its edits
 * in marker comments and re-applies between them on every run, so adding a new
 * renderer here flows through without manual edits. No-op (with a warning) when
 * the file is missing.
 */
export const registerRenderers = (repo: string, out: (line: string) => void): boolean => {
  const abs = join(repo, 'src', 'mdx-components.tsx')
  if (!existsSync(abs)) {
    out('⚠ src/mdx-components.tsx not found — register the renderers manually.')
    return false
  }
  let src = readFileSync(abs, 'utf8')
  const importsBlock = buildImportsBlock()

  if (src.includes(IMPORTS_START)) {
    src = replaceBlock(src, IMPORTS_START, IMPORTS_END, importsBlock) ?? src
  } else {
    // Prepend the block. Imports may be multi-line or interleaved with other
    // statements, so "insert after the last import" can split a multi-line
    // import; the top of the module is always valid for import declarations.
    src = `${importsBlock}\n\n${src}`
  }

  // Ensure the spread is present inside the returned components map.
  if (!src.includes(`${MAP_START}`)) {
    const spread = `${MAP_START}\n    ...mdkGeneratedComponents,\n    ${MAP_END}`
    const anchor = '...defaultMdxComponents,'
    if (src.includes(anchor)) {
      src = src.replace(anchor, `${anchor}\n    ${spread}`)
    } else {
      out('⚠ Could not find the components map anchor in mdx-components.tsx — register manually.')
      return false
    }
  }

  writeFileSync(abs, src, 'utf8')
  return true
}

// ─── Sidebar nav subtree (consumed by the docs site's hand-coded sidebar) ─────

/** A serializable fumadocs page-tree node (subset: no React `icon`). */
type NavNode =
  | { type: 'page'; name: string; url: string }
  | { type: 'folder'; name: string; children: NavNode[] }

const byName = (a: { name: string }, b: { name: string }): number => a.name.localeCompare(b.name)

const leafUrl = (versionLabel: string, ...segments: string[]): string =>
  pageUrl([...uiRootParts(versionLabel), ...segments].join('/'))

/**
 * Build the package-grouped nav subtree (react-devkit / react-adapter / ui-foundation
 * / fonts) that the docs site splices under its "UI Kit" sidebar node. Only
 * non-empty groups are emitted, so the shape follows the actual surface.
 */
export const buildUiNav = (dataset: DocsDataset, versionLabel: string): NavNode[] => {
  const nav: NavNode[] = []

  // react-devkit: components (primitives/domain → category) + devkit hooks.
  const bySub: Record<string, Record<string, NavNode[]>> = {}
  for (const c of dataset.components) {
    const sub = c.subpackage === SUB_PACKAGE.domain ? SUB_PACKAGE.domain : SUB_PACKAGE.primitives
    const cat = c.category ?? 'misc'
    ;((bySub[sub] ??= {})[cat] ??= []).push({
      type: 'page',
      name: c.name,
      url: pageUrl(componentPageRel(c, versionLabel)),
    })
  }
  const componentFolders: NavNode[] = []
  for (const sub of DEVKIT_SUBPACKAGES) {
    const cats = bySub[sub]
    if (!cats) continue
    const catFolders: NavNode[] = Object.keys(cats)
      .sort()
      .map((cat) => ({ type: 'folder', name: titleCase(cat), children: [...cats[cat]!].sort(byName) }))
    if (catFolders.length) componentFolders.push({ type: 'folder', name: titleCase(sub), children: catFolders })
  }
  const devkitChildren: NavNode[] = []
  if (componentFolders.length) devkitChildren.push({ type: 'folder', name: 'Components', children: componentFolders })
  const devkitHooks = dataset.hooks
    .filter((h) => h.package === PKG_DEVKIT)
    .map((h) => ({ type: 'page' as const, name: h.name, url: pageUrl(hookPageRel(h, versionLabel)) }))
  if (devkitHooks.length) devkitChildren.push({ type: 'folder', name: 'Hooks', children: devkitHooks.sort(byName) })
  if (devkitChildren.length) nav.push({ type: 'folder', name: PKG_DEVKIT, children: devkitChildren })

  // react-adapter: hooks.
  const adapterHooks = dataset.hooks
    .filter((h) => h.package === 'react-adapter')
    .map((h) => ({ type: 'page' as const, name: h.name, url: pageUrl(hookPageRel(h, versionLabel)) }))
  if (adapterHooks.length) {
    nav.push({ type: 'folder', name: 'react-adapter', children: [{ type: 'folder', name: 'Hooks', children: adapterHooks.sort(byName) }] })
  }

  // ui-foundation: stores, query helpers, utilities, constants.
  const coreChildren: NavNode[] = []
  if (dataset.stores.length) {
    coreChildren.push({
      type: 'folder',
      name: 'Stores',
      children: dataset.stores.map((st) => ({ type: 'page' as const, name: st.name, url: pageUrl(storePageRel(st.name, versionLabel)) })).sort(byName),
    })
  }
  if (dataset.queryHelpers.length) coreChildren.push({ type: 'page', name: 'Query helpers', url: leafUrl(versionLabel, PKG_CORE, 'query-helpers') })
  if (dataset.utilities.some((u) => u.kind === 'function')) coreChildren.push({ type: 'page', name: 'Utilities', url: leafUrl(versionLabel, PKG_CORE, 'utilities') })
  if (dataset.utilities.some((u) => u.kind === 'constant')) coreChildren.push({ type: 'page', name: 'Constants', url: leafUrl(versionLabel, PKG_CORE, 'constants') })
  if (coreChildren.length) nav.push({ type: 'folder', name: PKG_CORE, children: coreChildren })

  // fonts: single leaf page.
  if (dataset.fonts) nav.push({ type: 'page', name: 'Fonts', url: leafUrl(versionLabel, 'fonts') })

  return nav
}

// ─── Main entry ───────────────────────────────────────────────────────────────

/**
 * Scaffold the full generated documentation surface into the docs repo. Returns
 * a structured diff of what changed (consumed by the doc-writer report).
 */
export const scaffoldDocs = (opts: ScaffoldOptions): ScaffoldResult => {
  const out = opts.out ?? (() => {})
  const repo = opts.docsRepo
  const { dataset } = opts
  const uiRoot = join(repo, ...uiRootParts(opts.versionLabel))
  const previous = readManifest(repo)
  const s = new Scaffolder(repo, out, new Set(previous?.ownedFiles ?? []))

  // 1. active-version.ts — single source of truth for the dataset path version.
  s.writeOwned(
    join(repo, 'src', 'data', 'active-version.ts'),
    [
      '// mdk:generated — written by `mdk-ui docs:build`. Do not edit by hand.',
      `export const ACTIVE_DOCS_VERSION = "${opts.versionLabel}";`,
      '',
    ].join('\n'),
  )

  // Nav is grouped by package: content/docs/ui/<package>/…
  //   react-devkit → components (core / foundation → category) + devkit hooks
  //   react-adapter → hooks
  //   ui-foundation → stores, query helpers, utilities, constants
  //   fonts → single page

  // 2. Components — all ship from react-devkit; split by subpackage + category.
  for (const c of dataset.components) {
    const sub = c.subpackage === SUB_PACKAGE.domain ? SUB_PACKAGE.domain : SUB_PACKAGE.primitives
    const category = c.category ?? 'misc'
    const devkitRoot = join(uiRoot, PKG_DEVKIT)
    s.writePage(join(repo, componentPageRel(c, opts.versionLabel)), mdxPage(c.name, c.description, `<ComponentDoc name="${c.name}" />`))
    s.ensureRestNav(join(devkitRoot, 'components', sub, category), titleCase(category))
    s.ensureRestNav(join(devkitRoot, 'components', sub), titleCase(sub))
    s.ensureRestNav(join(devkitRoot, 'components'), 'Components')
    s.ensureRestNav(devkitRoot, PKG_DEVKIT)
  }

  // 3. Hooks — nested under their own package (react-devkit or react-adapter).
  for (const h of dataset.hooks) {
    const pkgRoot = join(uiRoot, h.package)
    s.writePage(join(repo, hookPageRel(h, opts.versionLabel)), mdxPage(h.name, h.description, `<HookDoc name="${h.name}" />`))
    s.ensureRestNav(join(pkgRoot, 'hooks'), 'Hooks')
    s.ensureRestNav(pkgRoot, h.package)
  }

  // 4. ui-foundation: stores + query helpers.
  const coreRoot = join(uiRoot, PKG_CORE)
  for (const st of dataset.stores) {
    s.writePage(join(repo, storePageRel(st.name, opts.versionLabel)), mdxPage(st.name, st.description, `<StoreDoc name="${st.name}" />`))
  }
  if (dataset.stores.length) s.ensureRestNav(join(coreRoot, 'stores'), 'Stores')
  if (dataset.queryHelpers.length) {
    s.writePage(
      join(coreRoot, 'query-helpers.mdx'),
      mdxPage('Query helpers', 'TanStack Query helpers exported by @tetherto/mdk-ui-foundation.', '<QueryHelpersDoc />'),
    )
  }

  // 5. ui-foundation: utilities and constants as separate pages (same renderer, filtered).
  if (dataset.utilities.some((u) => u.kind === 'function')) {
    s.writePage(
      join(coreRoot, 'utilities.mdx'),
      mdxPage('Utilities', 'Public utility functions exported by @tetherto/mdk-ui-foundation.', '<UtilitiesDoc kind="function" />'),
    )
  }
  if (dataset.utilities.some((u) => u.kind === 'constant')) {
    s.writePage(
      join(coreRoot, 'constants.mdx'),
      mdxPage('Constants', 'Public constants exported by @tetherto/mdk-ui-foundation.', '<UtilitiesDoc kind="constant" />'),
    )
  }
  if (dataset.stores.length || dataset.queryHelpers.length || dataset.utilities.length) {
    s.ensureRestNav(coreRoot, PKG_CORE)
  }

  // 6. Fonts — single page at the ui root (the fonts package leaf).
  if (dataset.fonts) {
    s.writePage(
      join(uiRoot, 'fonts.mdx'),
      mdxPage('Fonts', dataset.fonts.description || 'Font assets for MDK.', '<FontsDoc />'),
    )
  }

  // 7. Top-level nav: ensure the UI root auto-lists the package sections.
  s.ensureRestNav(uiRoot, 'UI Kit')

  // 8. Prune pages from a previous run that no longer have a source surface.
  s.prune(previous)

  // 9. Emit the sidebar nav subtree the docs site splices under its "UI Kit"
  //    node (the site's sidebar is hand-coded TS and can't auto-list hundreds
  //    of generated pages; it imports this JSON instead).
  const navAbs = join(repo, 'src', 'data', opts.versionLabel, 'ui-nav.json')
  mkdirSync(dirname(navAbs), { recursive: true })
  writeFileSync(navAbs, `${JSON.stringify(buildUiNav(dataset, opts.versionLabel), null, 2)}\n`, 'utf8')

  // 10. Persist the manifest + register the renderers.
  const manifest = s.manifest(opts.versionLabel)
  const manifestAbs = manifestPath(repo)
  mkdirSync(dirname(manifestAbs), { recursive: true })
  writeFileSync(manifestAbs, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  registerRenderers(repo, out)

  return s.result()
}
