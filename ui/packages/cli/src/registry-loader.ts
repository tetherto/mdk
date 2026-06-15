import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

/**
 * Audience tier for a registry entry. Mirrors `Tier` in
 * `@tetherto/mdk-react-devkit/scripts/registry-types.ts` but is kept local so
 * the CLI doesn't import from the devkit's internal scripts folder.
 */
export type Tier = 'agent-ready' | 'advanced' | 'internal'

/**
 * Minimal subset of the registry shape the CLI cares about. We keep this
 * local instead of depending on `@tetherto/mdk-react-devkit`'s build output
 * types so the CLI can ship independently.
 */
export type RegistryComponent = {
  name: string
  path: string
  description: string
  /** Audience tier; defaults to `advanced` for older registries. */
  tier?: Tier
  /**
   * Whether this component is part of the public API surface (`tier` ≠ `internal`).
   * Always `true` on registries older than schema 1.3.0 (they never contained internals).
   */
  public?: boolean
  category?: string
  orkCapabilities?: string[]
  domainContext?: string
  props: Array<{
    name: string
    type: string
    required: boolean
    default?: string
    description?: string
  }>
  /** Co-located examples — only emitted for `agent-ready` components in 1.2+. */
  examples?: string[]
  usageDoc?: string
}

export type RegistryHook = {
  name: string
  path: string
  description: string
  /** Audience tier; defaults to `advanced` for older registries. */
  tier?: Tier
  /**
   * Whether this hook is part of the public API surface (`tier` ≠ `internal`).
   * Always `true` on registries older than schema 1.3.0.
   */
  public?: boolean
  signature: string
  category?: string
  orkCapabilities?: string[]
  domainContext?: string
}

/**
 * O(1) lookup indexes added in schema 1.2.0. `componentsByName` / `hooksByName`
 * map a name to its index into the corresponding flat array; the rest map a
 * facet value (category, domain, ORK capability, tier) to a list of names.
 */
export type RegistryIndexes = {
  componentsByName: Record<string, number>
  hooksByName: Record<string, number>
  componentsByCategory: Record<string, string[]>
  componentsByDomain: Record<string, string[]>
  componentsByOrkCapability: Record<string, string[]>
  componentsByTier: Record<string, string[]>
  /** Added in schema 1.3.0. Keys are `"true"` / `"false"`. */
  componentsByPublic?: Record<string, string[]>
  hooksByDomain: Record<string, string[]>
  hooksByOrkCapability: Record<string, string[]>
  /** Added in schema 1.3.0. Keys are `"true"` / `"false"`. */
  hooksByPublic?: Record<string, string[]>
}

export type Registry = {
  version: string
  package: string
  packageVersion: string
  generatedAt: string
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
  for (let depth = 0; depth < 8; depth += 1) {
    if (existsSync(join(dir, 'package.json'))) return dir
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
  const subpath = resolveFromCwd(`${specifier}/registry.json`, cwd)
  if (subpath && existsSync(subpath)) {
    const packageDir = walkUpToPackageRoot(subpath)
    if (packageDir) return { packageDir, registryPath: subpath }
  }

  const main = resolveFromCwd(specifier, cwd)
  if (!main) return null
  const packageDir = walkUpToPackageRoot(main)
  if (!packageDir) return null
  return { packageDir, registryPath: join(packageDir, 'dist', 'registry.json') }
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
  orkCapabilities: string[]
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
    byOrkCapability: Record<string, string[]>
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
  const subpath = resolveFromCwd(`${opts.packageName}/blueprints.json`, cwd)
  if (subpath && existsSync(subpath)) {
    return JSON.parse(readFileSync(subpath, 'utf8')) as BlueprintsManifest
  }
  // Fallback: derive from the registry's package dir.
  try {
    const { packageDir } = loadRegistry(opts)
    const fallback = join(packageDir, 'dist', 'blueprints.json')
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
  const subpath = resolveFromCwd(`${opts.packageName}/hooks.json`, cwd)
  if (subpath && existsSync(subpath)) {
    return JSON.parse(readFileSync(subpath, 'utf8')) as HooksManifest
  }
  return null
}

// ─── Stores manifest (ui-core) ──────────────────────────────────────────────

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

export type StoresManifest = {
  version: string
  package: string
  stores: CoreStore[]
  queryHelpers: CoreQueryHelper[]
}

/**
 * Locate `dist/stores.json` published by a ui-core package. Returns `null`
 * when the file isn't present yet (older core builds).
 */
export const loadStoresManifest = (opts: LoadRegistryOptions): StoresManifest | null => {
  const cwd = opts.cwd ?? process.cwd()
  const subpath = resolveFromCwd(`${opts.packageName}/stores.json`, cwd)
  if (subpath && existsSync(subpath)) {
    return JSON.parse(readFileSync(subpath, 'utf8')) as StoresManifest
  }
  return null
}
