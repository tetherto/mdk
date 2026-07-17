import { createRequire } from 'node:module'
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  buildDataset,
  computeDrift,
  datasetToFiles,
  type DocsComponentRecord,
  type DocsDataset,
  type DocsHookRecord,
  type DocsQueryHelperRecord,
  type DocsStoreRecord,
  type DocsUtilityRecord,
  type DriftReport,
  serializeJson,
} from '../docs-data.js'
import {
  computeCoverage,
  type CoverageReport,
  type CuratedCatalog,
  formatCoverage,
} from '../docs-coverage.js'
import { DEFAULT_FORBIDDEN_PATTERNS, formatHits, scanFiles } from '../leak-guard.js'
import {
  loadFontsManifest,
  loadFontsManifestFromDir,
  loadHooksManifest,
  loadHooksManifestFromDir,
  loadRegistry,
  loadRegistryFromDir,
  loadStoresManifest,
  loadStoresManifestFromDir,
} from '../registry-loader.js'
import { buildReadme } from '../docs-readme.js'
import { scaffoldDocs, type ScaffoldResult } from '../docs-scaffold.js'
import { PACKAGES } from '../constants.js'
import { writeSyncReport } from '../docs-report.js'

export type DocsBuildOptions = {
  /** Devkit package to resolve when `--devkit-dir` is absent. */
  packageName: string
  /** Built devkit checkout (`<dir>/dist/registry.json`). Preferred lane. */
  devkitDir?: string
  /** react-adapter package to resolve when `--adapter-dir` is absent. */
  adapterPackage?: string
  /** Built react-adapter checkout (`<dir>/dist/hooks.json`). */
  adapterDir?: string
  /** ui-foundation package to resolve when `--core-dir` is absent. */
  corePackage?: string
  /** Built ui-foundation checkout (`<dir>/dist/stores.json`). */
  coreDir?: string
  /** fonts package to resolve when `--fonts-dir` is absent. */
  fontsPackage?: string
  /** Fonts package checkout (`<dir>/package.json` + `dist/fonts/`). */
  fontsDir?: string
  /** Explicit output directory. Mutually exclusive with `docsRepo`. */
  outDir?: string
  /** A local mdk-docs checkout. Output resolves under its src/data/<version>/generated. */
  docsRepo?: string
  /** Version segment for the docs-repo path + meta stamp. */
  versionLabel: string
  /** CI-style check: diff against committed tree, never write, signal drift. */
  reportOnly?: boolean
  /**
   * Scaffold MDX pages + nav into the docs repo after writing the dataset.
   * Defaults to `true` for the `--docs-repo` lane; ignored for `--out` and
   * `--report-only`.
   */
  scaffold?: boolean
  /** Include `public: false` entries (debug only — never commit these). */
  includeInternal?: boolean
  /** Path to a cli-manifest.json to embed as cli.json. Auto-resolved if omitted. */
  cliManifestPath?: string
  /** Forbidden substrings for the leak guard (defaults to `['mdk-prv']`). */
  forbiddenPatterns?: string[]
  /** Fixed ISO timestamp (tests); defaults to now. */
  now?: string
  cwd?: string
  out?: (line: string) => void
}

export type DocsBuildResult = {
  /** Absolute output directory. */
  outDir: string
  dataset: DocsDataset
  /** Present in report-only mode. */
  drift?: DriftReport
  /** Present when a docs-repo was given. */
  coverage?: CoverageReport
  /** Present when pages were scaffolded into a docs-repo. */
  scaffold?: ScaffoldResult
  /** Files actually written (empty in report-only mode). */
  written: string[]
}

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))

/** Locate the docs rendering-component templates (dist or source tree). */
const getDocsTemplatesRoot = (): string | null => {
  const candidates = [
    join(SCRIPT_DIR, '..', 'templates-docs'), // dist/templates-docs (published)
    join(SCRIPT_DIR, '..', '..', 'templates-docs'), // src → package root (dev/tests)
  ]
  return candidates.find((p) => existsSync(p)) ?? null
}

const resolveCliManifest = (explicit: string | undefined, cwd: string): string | null => {
  if (explicit) {
    if (!existsSync(explicit)) throw new Error(`CLI manifest not found at ${explicit}`)
    return readFileSync(explicit, 'utf8')
  }
  // Best-effort: resolve the published subpath export from the consuming project.
  try {
    const require = createRequire(join(cwd, 'package.json'))
    const p = require.resolve('@tetherto/mdk-ui-cli/cli-manifest.json')
    if (existsSync(p)) return readFileSync(p, 'utf8')
  } catch {
    // fall through — cli.json is optional
  }
  return null
}

/** Recursively read every file under `dir` into a relPath → contents map. */
const readTree = (dir: string): Map<string, string> => {
  const out = new Map<string, string>()
  if (!existsSync(dir)) return out
  const walk = (current: string): void => {
    for (const entry of readdirSync(current)) {
      const full = join(current, entry)
      if (statSync(full).isDirectory()) walk(full)
      else out.set(relative(dir, full).split('\\').join('/'), readFileSync(full, 'utf8'))
    }
  }
  walk(dir)
  return out
}

/** Parse the committed catalog arrays + aux file map for drift comparison. */
const readCommitted = (
  outDir: string,
): {
  components: DocsComponentRecord[]
  hooks: DocsHookRecord[]
  stores: DocsStoreRecord[]
  queryHelpers: DocsQueryHelperRecord[]
  utilities: DocsUtilityRecord[]
  aux: Map<string, string>
} => {
  const tree = readTree(outDir)
  const parseArr = <T>(rel: string): T[] => {
    const raw = tree.get(rel)
    if (!raw) return []
    try {
      return JSON.parse(raw) as T[]
    } catch {
      return []
    }
  }
  const components = parseArr<DocsComponentRecord>('components.json')
  const hooks = parseArr<DocsHookRecord>('hooks.json')
  const storesRaw = tree.get('stores.json')
  let stores: DocsStoreRecord[] = []
  let queryHelpers: DocsQueryHelperRecord[] = []
  let utilities: DocsUtilityRecord[] = []
  if (storesRaw) {
    try {
      const parsed = JSON.parse(storesRaw) as {
        stores?: DocsStoreRecord[]
        queryHelpers?: DocsQueryHelperRecord[]
        utilities?: DocsUtilityRecord[]
      }
      stores = parsed.stores ?? []
      queryHelpers = parsed.queryHelpers ?? []
      utilities = parsed.utilities ?? []
    } catch {
      // leave empty — treated as fully-new on first build
    }
  }
  const excluded = new Set(['components.json', 'hooks.json', 'stores.json', 'meta.json', 'README.md'])
  const aux = new Map<string, string>()
  for (const [rel, text] of tree) {
    if (excluded.has(rel)) continue
    aux.set(rel, text)
  }
  return { components, hooks, stores, queryHelpers, utilities, aux }
}

const readCuratedCatalog = (docsRepo: string, versionLabel: string): CuratedCatalog | null => {
  const dataDir = join(docsRepo, 'src', 'data', versionLabel)
  if (!existsSync(dataDir)) return null
  const readNames = (file: string, key: 'components' | 'hooks'): string[] => {
    const p = join(dataDir, file)
    if (!existsSync(p)) return []
    try {
      const json = JSON.parse(readFileSync(p, 'utf8')) as Record<string, Array<{ name: string }>>
      return (json[key] ?? []).map((e) => e.name)
    } catch {
      return []
    }
  }
  const componentNames = new Set(readNames('components.json', 'components'))
  const hookNames = new Set(readNames('hooks.json', 'hooks'))
  const skip = new Set<string>([
    ...readNames('dont-document-components.json', 'components'),
    ...readNames('dont-document-hooks.json', 'hooks'),
    ...readNames('document-when-fixed.json', 'components'),
    ...readNames('document-when-fixed.json', 'hooks'),
  ])
  return { componentNames, hookNames, skip }
}

/** Install rendering components into the docs repo, never overwriting. */
const installRenderingComponents = (docsRepo: string, out: (s: string) => void): void => {
  const templatesRoot = getDocsTemplatesRoot()
  if (!templatesRoot) {
    out('⚠ Rendering component templates not found in the CLI package — skipping install.')
    return
  }
  const destDir = join(docsRepo, 'src', 'components')
  mkdirSync(destDir, { recursive: true })
  const installed: string[] = []
  for (const entry of readdirSync(templatesRoot)) {
    if (!entry.endsWith('.tsx')) continue
    const dest = join(destDir, entry)
    if (existsSync(dest)) continue
    cpSync(join(templatesRoot, entry), dest)
    installed.push(entry)
  }
  if (installed.length) {
    out(`✓ Installed rendering component(s) into src/components/: ${installed.join(', ')}`)
    out('  They are registered in src/mdx-components.tsx automatically when scaffolding is on.')
  }
}

const formatDrift = (report: DriftReport): string => JSON.stringify(report, null, 2)

/** One-line-per-bucket summary of what the scaffolder changed. */
const formatScaffold = (r: ScaffoldResult): string => {
  const lines = [
    `✓ Scaffolded pages: +${r.created.length} new, ~${r.updated.length} updated, ` +
      `-${r.deleted.length} removed (${r.unchanged.length} unchanged).`,
  ]
  if (r.patched.length) lines.push(`  Patched ${r.patched.length} nav file(s) with a "..." rest entry.`)
  if (r.skipped.length) {
    lines.push(`  ⚠ Skipped ${r.skipped.length} hand-written page(s) (name collision):`)
    lines.push(...r.skipped.map((p) => `    ${p}`))
  }
  return lines.join('\n')
}

export const runDocsBuild = async (opts: DocsBuildOptions): Promise<DocsBuildResult> => {
  const out =
    opts.out ??
    ((s: string) => {
      // eslint-disable-next-line no-console
      console.log(s)
    })
  const cwd = opts.cwd ?? process.cwd()
  const patterns = opts.forbiddenPatterns ?? DEFAULT_FORBIDDEN_PATTERNS

  if (opts.outDir && opts.docsRepo) {
    throw new Error('Pass either --out or --docs-repo, not both.')
  }

  // 1. Resolve the registry + package dir.
  const { registry, packageDir } = opts.devkitDir
    ? loadRegistryFromDir(resolve(opts.devkitDir))
    : loadRegistry({ packageName: opts.packageName, cwd })

  // 1b. Resolve the adapter hooks + core stores manifests (optional — older
  // builds may not ship them). The `--adapter-dir` / `--core-dir` lanes mirror
  // `--devkit-dir` for the unpublished workspace packages.
  const adapterPackage = opts.adapterPackage ?? PACKAGES.adapter
  const corePackage = opts.corePackage ?? PACKAGES.core
  const hooksManifest = opts.adapterDir
    ? loadHooksManifestFromDir(resolve(opts.adapterDir))
    : loadHooksManifest({ packageName: adapterPackage, cwd })
  const storesManifest = opts.coreDir
    ? loadStoresManifestFromDir(resolve(opts.coreDir))
    : loadStoresManifest({ packageName: corePackage, cwd })
  const fontsPackage = opts.fontsPackage ?? PACKAGES.fonts
  const fontsManifest = opts.fontsDir
    ? loadFontsManifestFromDir(resolve(opts.fontsDir))
    : loadFontsManifest({ packageName: fontsPackage, cwd })
  if (!hooksManifest) out(`⚠ No adapter hooks manifest found (${adapterPackage}); hooks.json will be devkit-only.`)
  if (!storesManifest) out(`⚠ No ui-foundation stores manifest found (${corePackage}); stores.json will be empty.`)
  if (!fontsManifest) out(`⚠ No fonts manifest found (${fontsPackage}); fonts.json will be omitted.`)

  // 2. Resolve the output directory.
  const outDir = opts.docsRepo
    ? join(resolve(opts.docsRepo), 'src', 'data', opts.versionLabel, 'generated')
    : opts.outDir
      ? resolve(opts.outDir)
      : (() => {
          throw new Error('Provide an output target: --docs-repo <path> or --out <dir>.')
        })()

  // 3. Build the dataset (resolving usage/example pointers off disk).
  const readFile = (relPath: string): string | null => {
    const abs = join(packageDir, relPath)
    return existsSync(abs) ? readFileSync(abs, 'utf8') : null
  }
  const cliManifest = resolveCliManifest(opts.cliManifestPath, cwd)
  const dataset = buildDataset({
    registry,
    versionLabel: opts.versionLabel,
    generatedAt: opts.now ?? new Date().toISOString(),
    includeInternal: !!opts.includeInternal,
    readFile,
    cliManifest,
    adapterHooks: hooksManifest?.hooks ?? [],
    coreStores: storesManifest?.stores ?? [],
    queryHelpers: storesManifest?.queryHelpers ?? [],
    utilities: storesManifest?.utilities ?? [],
    fonts: fontsManifest,
  })
  for (const w of dataset.warnings) out(`⚠ ${w}`)

  // 4. Assemble the full file map and run the leak guard before anything else.
  const dataFiles = datasetToFiles(dataset)
  const metaJson = serializeJson(dataset.meta)
  const readme = buildReadme(dataset.meta)
  const guardable = new Map(dataFiles)
  guardable.set('meta.json', metaJson)
  guardable.set('README.md', readme)
  const hits = scanFiles(guardable, patterns)
  if (hits.length) {
    out(`✖ Leak guard found ${hits.length} forbidden reference(s):`)
    out(formatHits(hits))
    throw new Error('Aborting: generated data contains forbidden references; nothing written.')
  }

  // 5a. Report-only: diff against the committed tree, never write.
  if (opts.reportOnly) {
    const committed = readCommitted(outDir)
    const drift = computeDrift(
      dataset,
      committed.components,
      committed.hooks,
      committed.aux,
      committed.stores,
      committed.queryHelpers,
      committed.utilities,
    )
    out(formatDrift(drift))
    return { outDir, dataset, drift, written: [] }
  }

  // 5b. Write: the command owns `generated/` — remove orphans, then write all.
  // Capture the committed tree first so we can report what actually changed.
  const committedBefore = readCommitted(outDir)
  const drift = computeDrift(
    dataset,
    committedBefore.components,
    committedBefore.hooks,
    committedBefore.aux,
    committedBefore.stores,
    committedBefore.queryHelpers,
    committedBefore.utilities,
  )
  mkdirSync(outDir, { recursive: true })
  const expected = new Set<string>([...dataFiles.keys(), 'meta.json', 'README.md'])
  const existing = readTree(outDir)
  for (const rel of existing.keys()) {
    if (!expected.has(rel)) rmSync(join(outDir, rel), { force: true })
  }
  const written: string[] = []
  const writeOne = (rel: string, contents: string): void => {
    const abs = join(outDir, rel)
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, contents, 'utf8')
    written.push(rel)
  }
  for (const [rel, contents] of dataFiles) writeOne(rel, contents)
  writeOne('meta.json', metaJson)
  writeOne('README.md', readme)
  out(
    `✓ Wrote ${written.length} file(s) to ${relative(cwd, outDir) || outDir} — ` +
      `${dataset.components.length} components, ${dataset.hooks.length} hooks, ` +
      `${dataset.stores.length} stores, ${dataset.queryHelpers.length} query helpers, ` +
      `${dataset.meta.counts.usageDocs} usage docs, ${dataset.meta.counts.examples} examples.`,
  )

  // 6. docs-repo conveniences: install components, scaffold pages, coverage.
  let coverage: CoverageReport | undefined
  let scaffold: ScaffoldResult | undefined
  if (opts.docsRepo) {
    const docsRepo = resolve(opts.docsRepo)
    installRenderingComponents(docsRepo, out)

    if (opts.scaffold !== false) {
      scaffold = scaffoldDocs({ docsRepo, versionLabel: opts.versionLabel, dataset, out })
      out('')
      out(formatScaffold(scaffold))
    }

    const curated = readCuratedCatalog(docsRepo, opts.versionLabel)
    if (curated) {
      coverage = computeCoverage(dataset.components, dataset.hooks, curated)
      out('')
      out(formatCoverage(coverage))
    }

    // Deterministic doc-writer report (HTML + Markdown twin).
    writeSyncReport({ docsRepo, dataset, drift, coverage, scaffold }, out)
  }

  return { outDir, dataset, coverage, scaffold, drift, written }
}
