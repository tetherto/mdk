import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

import { DIST_DIR, MANIFESTS, MAX_WALK_UP_DEPTH, PACKAGE_JSON, PACKAGES } from './constants.js'

/**
 * Audience tier for a registry entry. Mirrors `Tier` in
 * `@tetherto/mdk-react-devkit/scripts/registry-types.ts` but is kept local so
 * the CLI doesn't import from the devkit's internal scripts folder.
 */
/**
 * Audience tiers, as constants so call sites reference `TIERS.agentReady`
 * rather than repeating the literal. `agentReady` is the only tier
 * contractually required to ship a `USAGE.md` + `*.example.tsx` (see the
 * devkit's `AGENT_READY.md`); `advanced` / `internal` are reference-only.
 */
export const TIERS = {
  agentReady: 'agent-ready',
  advanced: 'advanced',
  internal: 'internal',
} as const

export type Tier = (typeof TIERS)[keyof typeof TIERS]

/**
 * Minimal subset of the registry shape the CLI cares about. We keep this
 * local instead of depending on `@tetherto/mdk-react-devkit`'s build output
 * types so the CLI can ship independently.
 */
export type RegistryComponent = {
  name: string
  path: string
  description: string
  /** Full untruncated JSDoc description; only present (1.4+) when it differs from `description`. */
  descriptionFull?: string
  /** Audience tier; defaults to `advanced` for older registries. */
  tier?: Tier
  /**
   * Whether this component is part of the public API surface (`tier` ≠ `internal`).
   * Always `true` on registries older than schema 1.3.0 (they never contained internals).
   */
  public?: boolean
  category?: string
  kernelCapabilities?: string[]
  domainContext?: string
  props: Array<{
    name: string
    type: string
    required: boolean
    default?: string
    description?: string
    /** Full untruncated prop JSDoc; only present (1.4+) when it differs from `description`. */
    descriptionFull?: string
  }>
  /** Co-located examples — only emitted for `agent-ready` components in 1.2+. */
  examples?: string[]
  usageDoc?: string
}

export type RegistryHook = {
  name: string
  path: string
  description: string
  /** Full untruncated JSDoc description; only present (1.4+) when it differs from `description`. */
  descriptionFull?: string
  /** Audience tier; defaults to `advanced` for older registries. */
  tier?: Tier
  /**
   * Whether this hook is part of the public API surface (`tier` ≠ `internal`).
   * Always `true` on registries older than schema 1.3.0.
   */
  public?: boolean
  signature: string
  category?: string
  kernelCapabilities?: string[]
  domainContext?: string
}

/**
 * O(1) lookup indexes added in schema 1.2.0. `componentsByName` / `hooksByName`
 * map a name to its index into the corresponding flat array; the rest map a
 * facet value (category, domain, Kernel capability, tier) to a list of names.
 */
export type RegistryIndexes = {
  componentsByName: Record<string, number>
  hooksByName: Record<string, number>
  componentsByCategory: Record<string, string[]>
  componentsByDomain: Record<string, string[]>
  componentsByKernelCapability: Record<string, string[]>
  componentsByTier: Record<string, string[]>
  /** Added in schema 1.3.0. Keys are `"true"` / `"false"`. */
  componentsByPublic?: Record<string, string[]>
  hooksByDomain: Record<string, string[]>
  hooksByKernelCapability: Record<string, string[]>
  /** Added in schema 1.3.0. Keys are `"true"` / `"false"`. */
  hooksByPublic?: Record<string, string[]>
}

export type Registry = {
  version: string
  package: string
  packageVersion: string
  generatedAt: string
  /** Added in schema 1.4.0. `gitSha` is `null` when built outside a git checkout. */
  generatedFrom?: { gitSha: string | null }
  components: RegistryComponent[]
  hooks: RegistryHook[]
  /** Optional in older registries; always present in 1.2+. */
  indexes?: RegistryIndexes
}

export type LoadRegistryOptions = {
  packageName: string
  /** Resolution root; defaults to `process.cwd()`. */
  cwd?: string
}

const resolveFromCwd = (specifier: string, cwd: string): string | null => {
  const require = createRequire(join(cwd, 'package.json'))
  try {
    return require.resolve(specifier)
  } catch {
    return null
  }
}

type ResolvedPackage = {
  /** The package root directory (contains `package.json`). */
  packageDir: string
  /** Absolute path to `registry.json` within the package. */
  registryPath: string
}

const walkUpToPackageRoot = (startFile: string): string | null => {
  let dir = dirname(startFile)
  for (let depth = 0; depth < MAX_WALK_UP_DEPTH; depth += 1) {
    if (existsSync(join(dir, PACKAGE_JSON))) return dir
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return null
}

const findPackage = (specifier: string, cwd: string): ResolvedPackage | null => {
  // Prefer subpath export resolution when available. This gives us the
  // absolute path of `registry.json` directly; we then walk up to find the
  // owning package root.
  const subpath = resolveFromCwd(`${specifier}/${MANIFESTS.registry}`, cwd)
  if (subpath && existsSync(subpath)) {
    const packageDir = walkUpToPackageRoot(subpath)
    if (packageDir) return { packageDir, registryPath: subpath }
  }

  const main = resolveFromCwd(specifier, cwd)
  if (!main) return null
  const packageDir = walkUpToPackageRoot(main)
  if (!packageDir) return null
  return { packageDir, registryPath: join(packageDir, DIST_DIR, MANIFESTS.registry) }
}

/**
 * Locate and read the registry manifest published by `packageName`. Throws a
 * descriptive error when the package isn't installed or hasn't been built.
 */
export const loadRegistry = (
  opts: LoadRegistryOptions,
): { registry: Registry; packageDir: string } => {
  const cwd = opts.cwd ?? process.cwd()
  const resolved = findPackage(opts.packageName, cwd)
  if (!resolved) {
    throw new Error(`Could not resolve ${opts.packageName} from ${cwd}. Is it installed?`)
  }
  const { packageDir, registryPath } = resolved
  if (!existsSync(registryPath)) {
    throw new Error(
      `Registry not found at ${registryPath}. Did you run \`npm run build\` in ${opts.packageName}?`,
    )
  }
  const registry = JSON.parse(readFileSync(registryPath, 'utf8')) as Registry
  return { registry, packageDir }
}

/**
 * Read the registry straight from a built devkit checkout (`<dir>/dist/registry.json`)
 * instead of resolving an installed package. This is the `--devkit-dir` lane used
 * by `docs:build` while the devkit is unpublished.
 */
export const loadRegistryFromDir = (
  devkitDir: string,
): { registry: Registry; packageDir: string } => {
  const registryPath = join(devkitDir, DIST_DIR, MANIFESTS.registry)
  if (!existsSync(registryPath)) {
    throw new Error(
      `Registry not found at ${registryPath}. Run \`npm run build:registry\` in the devkit package first.`,
    )
  }
  const registry = JSON.parse(readFileSync(registryPath, 'utf8')) as Registry
  return { registry, packageDir: devkitDir }
}

export const findComponent = (registry: Registry, name: string): RegistryComponent | undefined => {
  const idx = registry.indexes?.componentsByName[name]
  if (typeof idx === 'number') return registry.components[idx]
  return (
    registry.components.find((c) => c.name === name) ??
    registry.components.find((c) => c.name.toLowerCase() === name.toLowerCase())
  )
}

export const findHook = (registry: Registry, name: string): RegistryHook | undefined => {
  const idx = registry.indexes?.hooksByName[name]
  if (typeof idx === 'number') return registry.hooks[idx]
  return (
    registry.hooks.find((h) => h.name === name) ??
    registry.hooks.find((h) => h.name.toLowerCase() === name.toLowerCase())
  )
}

// ─── Blueprints ─────────────────────────────────────────────────────────────

export type Blueprint = {
  id: string
  title: string
  intent: string
  domain: string
  kernelCapabilities: string[]
  components: string[]
  hooks: string[]
  demoRoute?: string
  path: string
  body: string
}

export type BlueprintsManifest = {
  version: string
  package: string
  generatedAt: string
  blueprints: Blueprint[]
  indexes?: {
    byId: Record<string, number>
    byDomain: Record<string, string[]>
    byKernelCapability: Record<string, string[]>
    byComponent: Record<string, string[]>
  }
}

/**
 * Locate `dist/blueprints.json` published by `packageName`. Returns `null`
 * if the file isn't present (older devkits without the blueprints layer).
 */
export const loadBlueprints = (opts: LoadRegistryOptions): BlueprintsManifest | null => {
  const cwd = opts.cwd ?? process.cwd()
  // Reuse the same resolution flow as the registry — both files live under
  // `dist/` and the package is always the same.
  const subpath = resolveFromCwd(`${opts.packageName}/${MANIFESTS.blueprints}`, cwd)
  if (subpath && existsSync(subpath)) {
    return JSON.parse(readFileSync(subpath, 'utf8')) as BlueprintsManifest
  }
  // Fallback: derive from the registry's package dir.
  try {
    const { packageDir } = loadRegistry(opts)
    const fallback = join(packageDir, DIST_DIR, MANIFESTS.blueprints)
    if (existsSync(fallback)) {
      return JSON.parse(readFileSync(fallback, 'utf8')) as BlueprintsManifest
    }
  } catch {
    return null
  }
  return null
}

export const findBlueprint = (manifest: BlueprintsManifest, id: string): Blueprint | undefined => {
  const idx = manifest.indexes?.byId[id]
  if (typeof idx === 'number') return manifest.blueprints[idx]
  return manifest.blueprints.find((b) => b.id === id)
}

// ─── Hooks manifest (react-adapter) ─────────────────────────────────────────

export type AdapterHookCategory =
  | 'store'
  | 'utility'
  | 'permission'
  | 'ui'
  | 'external'
  | 'uncategorised'

export type AdapterHook = {
  name: string
  description: string
  category: AdapterHookCategory
  signature: string
  requiresProvider: boolean
  file: string
  external?: boolean
}

export type AdapterProvider = {
  name: string
  description: string
  file: string
  props: Array<{
    name: string
    type: string
    optional: boolean
    description: string
  }>
}

export type HooksManifest = {
  version: string
  package: string
  hooks: AdapterHook[]
  provider: AdapterProvider | null
}

/**
 * Locate `dist/hooks.json` published by a react-adapter package. Returns
 * `null` when the file isn't present yet (older adapter builds).
 */
export const loadHooksManifest = (opts: LoadRegistryOptions): HooksManifest | null => {
  const cwd = opts.cwd ?? process.cwd()
  const subpath = resolveFromCwd(`${opts.packageName}/${MANIFESTS.hooks}`, cwd)
  if (subpath && existsSync(subpath)) {
    return JSON.parse(readFileSync(subpath, 'utf8')) as HooksManifest
  }
  return null
}

/**
 * Read `dist/hooks.json` straight from a built react-adapter checkout, mirroring
 * `loadRegistryFromDir`. The `--adapter-dir` lane used by `docs:build` while the
 * adapter is unpublished. Returns `null` when the manifest isn't present.
 */
export const loadHooksManifestFromDir = (adapterDir: string): HooksManifest | null => {
  const manifestPath = join(adapterDir, DIST_DIR, MANIFESTS.hooks)
  if (!existsSync(manifestPath)) return null
  return JSON.parse(readFileSync(manifestPath, 'utf8')) as HooksManifest
}

// ─── Stores manifest (ui-foundation) ──────────────────────────────────────────────

export type StoreCategory =
  | 'auth'
  | 'devices'
  | 'notifications'
  | 'timezone'
  | 'actions'
  | 'uncategorised'

export type CoreStoreField = { name: string; signature: string }

export type CoreStore = {
  name: string
  category: StoreCategory
  description: string
  factory: string
  state: CoreStoreField[]
  actions: CoreStoreField[]
  file: string
}

export type CoreQueryHelper = {
  name: string
  signature: string
  description: string
  category: string
  file: string
}

export type CoreUtility = {
  name: string
  /** `function` for callables, `constant` for plain values. */
  kind: 'function' | 'constant'
  signature: string
  description: string
  category: string
  file: string
}

export type StoresManifest = {
  version: string
  package: string
  stores: CoreStore[]
  queryHelpers: CoreQueryHelper[]
  /** Public utilities + constants from ui-foundation (`./utils`, `./constants`). Absent on manifests < 1.1.0. */
  utilities?: CoreUtility[]
}

/**
 * Locate `dist/stores.json` published by a ui-foundation package. Returns `null`
 * when the file isn't present yet (older core builds).
 */
export const loadStoresManifest = (opts: LoadRegistryOptions): StoresManifest | null => {
  const cwd = opts.cwd ?? process.cwd()
  const subpath = resolveFromCwd(`${opts.packageName}/${MANIFESTS.stores}`, cwd)
  if (subpath && existsSync(subpath)) {
    return JSON.parse(readFileSync(subpath, 'utf8')) as StoresManifest
  }
  return null
}

/**
 * Read `dist/stores.json` straight from a built ui-foundation checkout, mirroring
 * `loadRegistryFromDir`. The `--core-dir` lane used by `docs:build` while
 * ui-foundation is unpublished. Returns `null` when the manifest isn't present.
 */
export const loadStoresManifestFromDir = (coreDir: string): StoresManifest | null => {
  const manifestPath = join(coreDir, DIST_DIR, MANIFESTS.stores)
  if (!existsSync(manifestPath)) return null
  return JSON.parse(readFileSync(manifestPath, 'utf8')) as StoresManifest
}

// ─── Fonts manifest (@tetherto/mdk-fonts) ────────────────────────────────────

/** A single shipped font weight asset. */
export type FontAsset = { weight: string; file: string }

/**
 * Describes the fonts package surface a consumer imports. There is no published
 * `*.json` manifest for fonts — this is derived from the package's `package.json`
 * (`exports`) and the `dist/fonts/` asset directory, so it stays accurate as
 * weights are added or removed.
 */
export type FontsManifest = {
  package: string
  packageVersion: string
  description: string
  /** Import specifiers consumers use, derived from package.json `exports`. */
  imports: string[]
  /** Available font weight assets, sorted by filename. */
  assets: FontAsset[]
}

/** `JetBrainsMono-SemiBold.woff2` → `SemiBold`. */
const weightFromFontFile = (file: string): string => {
  const m = /-([A-Za-z]+)\.woff2$/.exec(file)
  return m?.[1] ?? file
}

/**
 * Build a fonts manifest from a fonts package checkout. Reads `package.json`
 * for the name/version/description + `exports`, and lists `dist/fonts/*.woff2`
 * for the available weights. Returns `null` when the directory isn't a fonts
 * package (no `package.json`).
 */
export const loadFontsManifestFromDir = (fontsDir: string): FontsManifest | null => {
  const pkgPath = join(fontsDir, PACKAGE_JSON)
  if (!existsSync(pkgPath)) return null
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
    name?: string
    version?: string
    description?: string
    exports?: Record<string, unknown>
  }
  const name = pkg.name ?? PACKAGES.fonts
  const imports = pkg.exports
    ? Object.keys(pkg.exports)
        .map((sub) => `${name}${sub.replace(/^\./, '')}`)
        .sort()
    : []
  const assetDir = join(fontsDir, DIST_DIR, 'fonts')
  const assets: FontAsset[] = existsSync(assetDir)
    ? readdirSync(assetDir)
        .filter((f) => f.endsWith('.woff2'))
        .sort()
        .map((file) => ({ weight: weightFromFontFile(file), file }))
    : []
  return {
    package: name,
    packageVersion: pkg.version ?? '0.0.0',
    description: pkg.description ?? '',
    imports,
    assets,
  }
}

/**
 * Resolve the installed fonts package (via its `jetbrains-mono.css` subpath
 * export) and build its manifest. Returns `null` when the package isn't
 * resolvable. Mirrors the `--fonts-dir` lane via `loadFontsManifestFromDir`.
 */
export const loadFontsManifest = (opts: LoadRegistryOptions): FontsManifest | null => {
  const cwd = opts.cwd ?? process.cwd()
  const css = resolveFromCwd(`${opts.packageName}/jetbrains-mono.css`, cwd)
  if (css && existsSync(css)) {
    const pkgRoot = walkUpToPackageRoot(css)
    if (pkgRoot) return loadFontsManifestFromDir(pkgRoot)
  }
  return null
}
