import type {
  AdapterHook,
  CoreQueryHelper,
  CoreStore,
  CoreUtility,
  FontsManifest,
  Registry,
  RegistryComponent,
  RegistryHook,
} from './registry-loader.js'

/**
 * Schema version of the generated docs dataset (the `…/generated/` tree
 * `docs:build` emits). Independent of the registry schema — bump when the
 * shape the docs-repo rendering components consume changes.
 *
 * 1.1.0 — `hooks.json` now spans both the devkit and the react-adapter (each
 * record tags its `package`); added `stores.json` (ui-foundation stores + query
 * helpers). Both changes are additive.
 *
 * 1.2.0 — added `fonts.json` (the `@tetherto/mdk-fonts` package surface: import
 * specifiers + available weight assets). Additive.
 *
 * 1.3.0 — `stores.json` now also carries `utilities` (public ui-foundation
 * utilities + constants from `./utils` and `./constants`). Additive.
 *
 * 2.0.0 - `orkCapabilities` renamed to `kernelCapabilities` across the
 * emitted datasets (ORK -> Kernel nomenclature shift). Breaking: docs-repo
 * rendering components must read the new field.
 */
export const DOCS_DATA_SCHEMA_VERSION = '2.0.0'

/** Which package a hook record was sourced from. */
export type HookPackage = 'react-devkit' | 'react-adapter'

/** Sub-package buckets a component can be classified into; `other` is the catch-all. */
export const SUB_PACKAGE = {
  primitives: 'primitives',
  domain: 'domain',
  other: 'other',
} as const
/** Which devkit sub-package a component lives in, derived from its source path. */
export type SubPackage = (typeof SUB_PACKAGE)[keyof typeof SUB_PACKAGE]
/** The devkit sub-packages that map to component nav folders, in display order. */
export const DEVKIT_SUBPACKAGES = [SUB_PACKAGE.primitives, SUB_PACKAGE.domain] as const

export type DocsPropRecord = {
  name: string
  type: string
  required: boolean
  default?: string
  description?: string
}

export type DocsComponentRecord = {
  name: string
  subpackage: SubPackage
  tier?: string
  category?: string
  domainContext?: string
  kernelCapabilities?: string[]
  /** Full description (prefers `descriptionFull`, falls back to the short form). */
  description: string
  props: DocsPropRecord[]
  /** Relative path to the usage doc within the dataset, when one ships. */
  usageFile?: string
  /** Relative paths to example sources within the dataset, when any ship. */
  exampleFiles?: string[]
  /** Source path within the devkit package (safe — always `src/...`). */
  sourcePath: string
}

export type DocsHookRecord = {
  name: string
  /** Source package — `react-devkit` (foundation hooks) or `react-adapter` (store/binding hooks). */
  package: HookPackage
  tier?: string
  category?: string
  domainContext?: string
  kernelCapabilities?: string[]
  /** Whether the hook must run inside `<MdkProvider>` (adapter hooks only). */
  requiresProvider?: boolean
  description: string
  signature: string
}

/** A single state field or action on a store. */
export type DocsStoreFieldRecord = { name: string; signature: string }

export type DocsStoreRecord = {
  name: string
  category: string
  description: string
  /** The factory that creates the store instance. */
  factory: string
  state: DocsStoreFieldRecord[]
  actions: DocsStoreFieldRecord[]
  /** Source path within the ui-foundation package (safe — always `src/...`). */
  sourcePath: string
}

export type DocsQueryHelperRecord = {
  name: string
  category: string
  description: string
  signature: string
  /** Source path within the ui-foundation package (safe — always `src/...`). */
  sourcePath: string
}

export type DocsUtilityRecord = {
  name: string
  kind: 'function' | 'constant'
  category: string
  description: string
  signature: string
  /** Source path within the ui-foundation package (safe — always `src/...`). */
  sourcePath: string
}

/** A single font weight shipped by the fonts package. */
export type DocsFontAssetRecord = { weight: string; file: string }

/** The `@tetherto/mdk-fonts` package surface (import specifiers + weights). */
export type DocsFontsRecord = {
  package: string
  packageVersion: string
  description: string
  imports: string[]
  assets: DocsFontAssetRecord[]
}

export type DocsMeta = {
  schemaVersion: string
  versionLabel: string
  generatedFrom: {
    package: string
    packageVersion: string
    registrySchema: string
    gitSha: string | null
    generatedAt: string
  }
  counts: {
    components: number
    hooks: number
    stores: number
    queryHelpers: number
    usageDocs: number
    examples: number
  }
}

/** A fully-built dataset, held in memory before it touches disk. */
export type DocsDataset = {
  meta: DocsMeta
  components: DocsComponentRecord[]
  /** Merged devkit + adapter hooks, sorted by name (each tags its `package`). */
  hooks: DocsHookRecord[]
  stores: DocsStoreRecord[]
  queryHelpers: DocsQueryHelperRecord[]
  utilities: DocsUtilityRecord[]
  /** The fonts package surface, or `null` when no fonts manifest was provided. */
  fonts: DocsFontsRecord | null
  /** relPath (within the dataset dir) → file contents, for usage/example/cli files. */
  files: Map<string, string>
  /** Pointers that the registry recorded but couldn't be read off disk. */
  warnings: string[]
}

const subPackageFromPath = (path: string): SubPackage => {
  if (path.startsWith(`src/${SUB_PACKAGE.primitives}/`) || path.includes(`/${SUB_PACKAGE.primitives}/`)) return SUB_PACKAGE.primitives
  if (path.startsWith(`src/${SUB_PACKAGE.domain}/`) || path.includes(`/${SUB_PACKAGE.domain}/`)) return SUB_PACKAGE.domain
  return SUB_PACKAGE.other
}

/** Strip a leading directory, returning just the file's basename. */
const basename = (p: string): string => p.split('/').pop() ?? p

const fullDescription = (short: string, full?: string): string => full ?? short

/**
 * Normalise a TypeScript signature for publication. The compiler's type printer
 * inlines absolute module paths as `import("/abs/path/to/module").Type` — these
 * leak the local checkout path (machine-specific, and includes the private repo
 * slug) and add noise. Collapse them to the bare referenced name so signatures
 * are portable, deterministic across machines, and safe to publish.
 *
 * Source signatures are sometimes truncated mid-path (the upstream generator
 * caps length), leaving a dangling `import("/abs/path…` — sometimes mid-path
 * (no closing quote), sometimes just past the closing quote (`import("/abs"…`)
 * with the closing paren cut off. Both leak the checkout path. Since the two
 * complete-form passes above have already removed every well-formed
 * `import("…")`, any `import("` left must be that truncated tail: consume it to
 * end-of-string (ignoring the stray closing quote) so the leak never reaches disk.
 */
const sanitizeSignature = (signature: string): string =>
  signature
    .replace(/import\("[^"]*"\)\./g, '') // import("…").Type → Type
    .replace(/import\("[^"]*"\)/g, '') // import("…") → ''
    .replace(/import\("[^)]*$/g, '…') // dangling/truncated import("/abs/path…["…] → …
    .trimEnd()

/**
 * Build the catalog records (components + hooks) from the registry, in a
 * deterministic, sorted, fixed-field-order shape. Pure — no disk access.
 * `readFile` resolves a registry-relative pointer to its contents, or `null`
 * when the file is missing (recorded as a warning).
 */
export type BuildDatasetOptions = {
  registry: Registry
  versionLabel: string
  generatedAt: string
  includeInternal: boolean
  /** Resolve a package-relative pointer (usageDoc / example path) to text. */
  readFile: (relPath: string) => string | null
  /** Optional pre-read CLI manifest JSON to embed as `cli.json`. */
  cliManifest?: string | null
  /** react-adapter hooks, merged into `hooks.json` alongside the devkit hooks. */
  adapterHooks?: AdapterHook[]
  /** ui-foundation stores, emitted to `stores.json`. */
  coreStores?: CoreStore[]
  /** ui-foundation query helpers, emitted to `stores.json`. */
  queryHelpers?: CoreQueryHelper[]
  /** ui-foundation public utilities + constants, emitted to `stores.json`. */
  utilities?: CoreUtility[]
  /** Fonts package surface, emitted to `fonts.json`. */
  fonts?: FontsManifest | null
}

/** Serialise a JSON value the way the dataset is written (2-space, trailing LF). */
export const serializeJson = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`

/**
 * Strip Markdown links whose target points at a source-tree `USAGE.md` (e.g. a
 * sibling-component cross-reference like `[\`Foo\`](../foo/USAGE.md)`), keeping
 * the link text. Those paths only exist in the monorepo source, never resolve on
 * the docs site, and would fail the built-link check.
 */
export const stripUsageLinks = (markdown: string): string =>
  markdown.replace(/\[([^\]]+)\]\([^)]*USAGE\.md[^)]*\)/g, '$1')

export const buildDataset = (opts: BuildDatasetOptions): DocsDataset => {
  const { registry, versionLabel, generatedAt, includeInternal, readFile } = opts
  const warnings: string[] = []
  const files = new Map<string, string>()

  const isVisible = (entry: { public?: boolean }): boolean =>
    includeInternal || entry.public !== false

  const sourceComponents = [...registry.components]
    .filter(isVisible)
    .sort((a, b) => a.name.localeCompare(b.name))
  const sourceHooks = [...registry.hooks]
    .filter(isVisible)
    .sort((a, b) => a.name.localeCompare(b.name))

  let usageDocs = 0
  let examples = 0

  const components: DocsComponentRecord[] = sourceComponents.map((c: RegistryComponent) => {
    const record: DocsComponentRecord = {
      name: c.name,
      subpackage: subPackageFromPath(c.path),
      ...(c.tier ? { tier: c.tier } : {}),
      ...(c.category ? { category: c.category } : {}),
      ...(c.domainContext ? { domainContext: c.domainContext } : {}),
      ...(c.kernelCapabilities?.length ? { kernelCapabilities: c.kernelCapabilities } : {}),
      description: fullDescription(c.description, c.descriptionFull),
      props: c.props.map((p) => ({
        name: p.name,
        type: p.type,
        required: p.required,
        ...(p.default !== undefined ? { default: p.default } : {}),
        ...(p.description !== undefined || p.descriptionFull !== undefined
          ? { description: fullDescription(p.description ?? '', p.descriptionFull) }
          : {}),
      })),
      sourcePath: c.path,
    }

    // Usage doc → usage/<Name>.md
    if (c.usageDoc) {
      const text = readFile(c.usageDoc)
      if (text === null) {
        warnings.push(`Usage pointer for ${c.name} not found on disk: ${c.usageDoc}`)
      } else {
        const clean = stripUsageLinks(text)
        const rel = `usage/${c.name}.md`
        files.set(rel, clean.endsWith('\n') ? clean : `${clean}\n`)
        record.usageFile = rel
        usageDocs += 1
      }
    }

    // Examples → examples/<Name>/<basename>.tsx.txt (sorted for determinism)
    const examplePaths = [...(c.examples ?? [])].sort((a, b) => a.localeCompare(b))
    const exampleFiles: string[] = []
    for (const ex of examplePaths) {
      const text = readFile(ex)
      if (text === null) {
        warnings.push(`Example pointer for ${c.name} not found on disk: ${ex}`)
        continue
      }
      const rel = `examples/${c.name}/${basename(ex)}.txt`
      files.set(rel, text.endsWith('\n') ? text : `${text}\n`)
      exampleFiles.push(rel)
      examples += 1
    }
    if (exampleFiles.length) record.exampleFiles = exampleFiles

    return record
  })

  const devkitHooks: DocsHookRecord[] = sourceHooks.map((h: RegistryHook) => ({
    name: h.name,
    package: 'react-devkit' as const,
    ...(h.tier ? { tier: h.tier } : {}),
    ...(h.category ? { category: h.category } : {}),
    ...(h.domainContext ? { domainContext: h.domainContext } : {}),
    ...(h.kernelCapabilities?.length ? { kernelCapabilities: h.kernelCapabilities } : {}),
    description: fullDescription(h.description, h.descriptionFull),
    signature: sanitizeSignature(h.signature),
  }))

  // Merge the react-adapter hooks (store + binding hooks) into the same
  // catalog. Names are disjoint from the devkit set, but guard collisions so a
  // future clash is reported rather than silently dropped (devkit wins — it
  // carries the richer registry metadata).
  const devkitNames = new Set(devkitHooks.map((h) => h.name))
  const adapterHooks: DocsHookRecord[] = []
  for (const h of [...(opts.adapterHooks ?? [])].sort((a, b) => a.name.localeCompare(b.name))) {
    if (devkitNames.has(h.name)) {
      warnings.push(`Adapter hook ${h.name} collides with a devkit hook of the same name; kept the devkit record.`)
      continue
    }
    adapterHooks.push({
      name: h.name,
      package: 'react-adapter',
      ...(h.category ? { category: h.category } : {}),
      requiresProvider: h.requiresProvider,
      description: h.description,
      signature: sanitizeSignature(h.signature),
    })
  }
  const hooks: DocsHookRecord[] = [...devkitHooks, ...adapterHooks].sort((a, b) =>
    a.name.localeCompare(b.name),
  )

  // ui-foundation stores + query helpers → stores.json (sorted for determinism).
  const stores: DocsStoreRecord[] = [...(opts.coreStores ?? [])]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((s) => ({
      name: s.name,
      category: s.category,
      description: s.description,
      factory: s.factory,
      state: [...s.state]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((f) => ({ name: f.name, signature: sanitizeSignature(f.signature) })),
      actions: [...s.actions]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((f) => ({ name: f.name, signature: sanitizeSignature(f.signature) })),
      sourcePath: s.file,
    }))
  const queryHelpers: DocsQueryHelperRecord[] = [...(opts.queryHelpers ?? [])]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((q) => ({
      name: q.name,
      category: q.category,
      description: q.description,
      signature: sanitizeSignature(q.signature),
      sourcePath: q.file,
    }))
  const utilities: DocsUtilityRecord[] = [...(opts.utilities ?? [])]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((u) => ({
      name: u.name,
      kind: u.kind,
      category: u.category,
      description: u.description,
      signature: sanitizeSignature(u.signature),
      sourcePath: u.file,
    }))

  // Fonts package surface → fonts.json (sorted import specifiers + weight assets).
  const fonts: DocsFontsRecord | null = opts.fonts
    ? {
        package: opts.fonts.package,
        packageVersion: opts.fonts.packageVersion,
        description: opts.fonts.description,
        imports: [...opts.fonts.imports].sort(),
        assets: [...opts.fonts.assets].sort((a, b) => a.file.localeCompare(b.file)),
      }
    : null
  if (fonts) files.set('fonts.json', serializeJson(fonts))

  if (opts.cliManifest != null) files.set('cli.json', ensureTrailingNewline(opts.cliManifest))

  const meta: DocsMeta = {
    schemaVersion: DOCS_DATA_SCHEMA_VERSION,
    versionLabel,
    generatedFrom: {
      package: registry.package,
      packageVersion: registry.packageVersion,
      registrySchema: registry.version,
      gitSha: registry.generatedFrom?.gitSha ?? null,
      generatedAt,
    },
    counts: {
      components: components.length,
      hooks: hooks.length,
      stores: stores.length,
      queryHelpers: queryHelpers.length,
      usageDocs,
      examples,
    },
  }

  return { meta, components, hooks, stores, queryHelpers, utilities, fonts, files, warnings }
}

function ensureTrailingNewline(s: string): string {
  return s.endsWith('\n') ? s : `${s}\n`
}

/**
 * Flatten a dataset into the complete relPath → contents map that lands on
 * disk (catalog JSON + usage/example/cli files). `meta.json` and `README.md`
 * are added by the caller since they're excluded from drift comparison.
 */
export const datasetToFiles = (dataset: DocsDataset): Map<string, string> => {
  const out = new Map<string, string>()
  out.set('components.json', serializeJson(dataset.components))
  out.set('hooks.json', serializeJson(dataset.hooks))
  out.set(
    'stores.json',
    serializeJson({ stores: dataset.stores, queryHelpers: dataset.queryHelpers, utilities: dataset.utilities }),
  )
  for (const [rel, text] of dataset.files) out.set(rel, text)
  return out
}

// ─── Drift diffing ────────────────────────────────────────────────────────

export type CatalogDiff = {
  added: string[]
  removed: string[]
  changed: Array<{ name: string; fields: string[] }>
}

export type FileDiff = { added: string[]; removed: string[]; modified: string[] }

export type DriftReport = {
  hasDrift: boolean
  components: CatalogDiff
  hooks: CatalogDiff
  stores: CatalogDiff
  queryHelpers: CatalogDiff
  utilities: CatalogDiff
  files: FileDiff
}

type Named = { name: string }

/** Field-level diff of two catalogs keyed by `name`. */
export const diffCatalog = <T extends Named>(oldArr: T[], newArr: T[]): CatalogDiff => {
  const oldByName = new Map(oldArr.map((e) => [e.name, e]))
  const newByName = new Map(newArr.map((e) => [e.name, e]))
  const added = [...newByName.keys()].filter((n) => !oldByName.has(n)).sort()
  const removed = [...oldByName.keys()].filter((n) => !newByName.has(n)).sort()
  const changed: CatalogDiff['changed'] = []
  for (const [name, newEntry] of newByName) {
    const oldEntry = oldByName.get(name)
    if (!oldEntry) continue
    const keys = new Set([...Object.keys(oldEntry), ...Object.keys(newEntry)])
    const fields: string[] = []
    for (const k of keys) {
      const ov = JSON.stringify((oldEntry as Record<string, unknown>)[k])
      const nv = JSON.stringify((newEntry as Record<string, unknown>)[k])
      if (ov !== nv) fields.push(k)
    }
    if (fields.length) changed.push({ name, fields: fields.sort() })
  }
  changed.sort((a, b) => a.name.localeCompare(b.name))
  return { added, removed, changed }
}

/** Byte-compare two file maps (used for usage/example/cli files). */
export const diffFiles = (oldFiles: Map<string, string>, newFiles: Map<string, string>): FileDiff => {
  const added = [...newFiles.keys()].filter((f) => !oldFiles.has(f)).sort()
  const removed = [...oldFiles.keys()].filter((f) => !newFiles.has(f)).sort()
  const modified = [...newFiles.keys()]
    .filter((f) => oldFiles.has(f) && oldFiles.get(f) !== newFiles.get(f))
    .sort()
  return { added, removed, modified }
}

const catalogHasDrift = (d: CatalogDiff): boolean =>
  d.added.length > 0 || d.removed.length > 0 || d.changed.length > 0

const fileDiffHasDrift = (d: FileDiff): boolean =>
  d.added.length > 0 || d.removed.length > 0 || d.modified.length > 0

/**
 * Compare a freshly-built dataset against the committed tree. `meta.json` and
 * `README.md` are intentionally absent from both `committed*` inputs — they
 * carry volatile/non-data content and never count as drift.
 */
export const computeDrift = (
  dataset: DocsDataset,
  committedComponents: DocsComponentRecord[],
  committedHooks: DocsHookRecord[],
  committedAuxFiles: Map<string, string>,
  committedStores: DocsStoreRecord[] = [],
  committedQueryHelpers: DocsQueryHelperRecord[] = [],
  committedUtilities: DocsUtilityRecord[] = [],
): DriftReport => {
  const components = diffCatalog(committedComponents, dataset.components)
  const hooks = diffCatalog(committedHooks, dataset.hooks)
  const stores = diffCatalog(committedStores, dataset.stores)
  const queryHelpers = diffCatalog(committedQueryHelpers, dataset.queryHelpers)
  // Utilities ship inside stores.json (which is excluded from the file diff), so
  // they must be diffed as a catalog — otherwise a utilities-only change slips
  // past --report-only and CI passes on stale docs.
  const utilities = diffCatalog(committedUtilities, dataset.utilities)
  const files = diffFiles(committedAuxFiles, dataset.files)
  const hasDrift =
    catalogHasDrift(components) ||
    catalogHasDrift(hooks) ||
    catalogHasDrift(stores) ||
    catalogHasDrift(queryHelpers) ||
    catalogHasDrift(utilities) ||
    fileDiffHasDrift(files)
  return { hasDrift, components, hooks, stores, queryHelpers, utilities, files }
}
