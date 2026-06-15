/**
 * Schema for the machine-readable component registry consumed by AI agents.
 *
 * The registry is generated at build time from JSDoc/TSDoc + TypeScript prop
 * types and emitted to `dist/registry.json`. Agents read this single file to
 * discover the entire MDK surface area without parsing source.
 *
 * Keep this file the single source of truth for the schema — the registry
 * generator, the `@tetherto/mdk-ui-cli` package, and any future MCP server
 * all consume these types.
 */

/** Mining domain area a component belongs to. Used to narrow the registry. */
export type DomainContext =
  | 'mining-operations'
  | 'financial-reporting'
  | 'device-management'
  | 'generic'

/**
 * Audience tier for a registry entry. Drives the default visibility of
 * `mdk-ui registry`, the `check:usage-docs` CI gate, and what an MCP server
 * surfaces to LLM tool calls.
 *
 * - `agent-ready`: stable, props-driven, recommended for autonomous LLM use.
 *   Must ship JSDoc + `USAGE.md` + a runnable `*.example.tsx`.
 * - `advanced`: exported for engineers extending the library; JSDoc only.
 * - `internal`: implementation detail; present in the full registry with
 *   `public: false` but excluded from the default CLI view.
 */
export type Tier = 'agent-ready' | 'advanced' | 'internal'

/**
 * Default tier assumed by *consumers* of the registry when no `@tier` is
 * present on an entry. The generator itself no longer applies this default
 * — it emits `tier: undefined` so the `missing-tier` rule can fire.
 *
 * Consumers (CLI, blueprints validator, etc.) treat `undefined` as
 * `advanced` for display, while the contract gate treats it as a
 * violation. Two audiences, one schema.
 */
export const DEFAULT_TIER: Tier = 'advanced'

/**
 * ORK (Operational Resource Kind) capability identifier this component is
 * suited to visualise. Lets an agent pick the right component given the
 * active ORK capabilities for a site.
 */
export type OrkCapability =
  | 'hashrate-monitoring'
  | 'pool-performance'
  | 'energy-consumption'
  | 'incident-alerts'
  | 'device-telemetry'
  | 'device-management'
  | (string & {})

/** One prop / parameter on a component or hook. */
export type PropMeta = {
  name: string
  /**
   * Serialised TypeScript type (e.g. `string`, `HashrateDataPoint[]`).
   * Truncated to 240 chars + `… /* see source *\/` when longer to keep the
   * registry payload small. Full type is available from the source file.
   */
  type: string
  required: boolean
  /** Default value as a source-literal string (`"false"`, `"4"`). */
  default?: string
  /**
   * Short JSDoc on the prop, when present. Truncated at 120 chars — long-form
   * usage lives in the co-located `USAGE.md`.
   */
  description?: string
}

/** Metadata for a single exported component. */
export type ComponentMeta = {
  name: string
  /** Relative path (from the package root) to the source file. */
  path: string
  /**
   * First paragraph of JSDoc on the component. Truncated to 200 chars — the
   * long-form lives in `USAGE.md` for `agent-ready` components.
   */
  description: string
  /**
   * Audience tier; pulled from `@tier` JSDoc tag. **Undefined when the tag
   * is absent** — consumers display as `advanced` but the contract gate
   * flags it as `missing-tier`.
   */
  tier?: Tier
  /**
   * Whether this component is part of the public API surface (i.e. `tier`
   * is not `internal`). Derived at generation time — no annotation required.
   * Consumers use this to show/hide the entry without inspecting `tier`.
   */
  public: boolean
  /** Free-form category tag pulled from `@category` (e.g. `charts`, `tables`). */
  category?: string
  /** ORK capabilities pulled from `@orkCapability` tags. */
  orkCapabilities?: OrkCapability[]
  /** Mining domain area pulled from `@domain`. */
  domainContext?: DomainContext
  /** Source-derived prop information. */
  props: PropMeta[]
  /**
   * Paths (relative to the package root) of co-located `*.example.tsx` files.
   * Only emitted for `agent-ready` components.
   */
  examples?: string[]
  /**
   * Path to a co-located `USAGE.md` when present. Only emitted for
   * `agent-ready` components.
   */
  usageDoc?: string
}

/** Metadata for a single exported hook. */
export type HookMeta = {
  name: string
  path: string
  /** First paragraph of JSDoc; truncated to 200 chars. */
  description: string
  /** Audience tier; undefined when `@tier` is absent (see `ComponentMeta.tier`). */
  tier?: Tier
  /** Whether this hook is part of the public API surface (`tier` ≠ `internal`). */
  public: boolean
  /**
   * Serialised function signature. Truncated to 240 chars when longer.
   */
  signature: string
  category?: string
  orkCapabilities?: OrkCapability[]
  domainContext?: DomainContext
}

/**
 * O(1) lookup indexes for the registry. Values are either component/hook
 * indexes into the `components` / `hooks` arrays (`byName`) or arrays of
 * names (`byCategory`, `byDomain`, `byOrkCapability`, `byTier`).
 *
 * Agents use these to skip scanning the flat arrays.
 */
export type RegistryIndexes = {
  componentsByName: Record<string, number>
  hooksByName: Record<string, number>
  componentsByCategory: Record<string, string[]>
  componentsByDomain: Record<string, string[]>
  componentsByOrkCapability: Record<string, string[]>
  componentsByTier: Record<string, string[]>
  /** Keys are `"true"` and `"false"`. Lets consumers quickly get the public surface. */
  componentsByPublic: Record<string, string[]>
  hooksByDomain: Record<string, string[]>
  hooksByOrkCapability: Record<string, string[]>
  /** Keys are `"true"` and `"false"`. */
  hooksByPublic: Record<string, string[]>
}

/** Top-level registry manifest, emitted as `dist/registry.json`. */
export type RegistryManifest = {
  /** Registry schema version. */
  version: string
  /** npm package name this registry describes. */
  package: string
  /** Package semver. */
  packageVersion: string
  /** ISO timestamp of when the registry was generated. */
  generatedAt: string
  components: ComponentMeta[]
  hooks: HookMeta[]
  indexes: RegistryIndexes
}

/** Current registry schema version. Bump on breaking changes. */
export const REGISTRY_SCHEMA_VERSION = '1.3.0'

// ─── Blueprints ─────────────────────────────────────────────────────────────

/**
 * A blueprint is a curated recipe that maps a free-form user intent to a
 * concrete set of agent-ready components + hooks + a demo route. Authored as
 * markdown with YAML frontmatter under `packages/react-devkit/blueprints/`
 * and indexed into `dist/blueprints.json` by the registry generator.
 */
export type BlueprintMeta = {
  id: string
  title: string
  intent: string
  domain: DomainContext
  orkCapabilities: OrkCapability[]
  components: string[]
  hooks: string[]
  demoRoute?: string
  /** Path (relative to the package root) to the authoring `.md` file. */
  path: string
  /** Markdown body (everything after the YAML frontmatter). */
  body: string
}

/** O(1) lookup indexes for blueprints. */
export type BlueprintIndexes = {
  byId: Record<string, number>
  byDomain: Record<string, string[]>
  byOrkCapability: Record<string, string[]>
  byComponent: Record<string, string[]>
}

/** Top-level blueprints manifest, emitted as `dist/blueprints.json`. */
export type BlueprintsManifest = {
  version: string
  package: string
  generatedAt: string
  blueprints: BlueprintMeta[]
  indexes: BlueprintIndexes
}

/** Current blueprints schema version. */
export const BLUEPRINTS_SCHEMA_VERSION = '1.0.0'

/** Cap on description length emitted into the registry. */
export const DESCRIPTION_MAX_CHARS = 200
/** Cap on a single prop description in the registry. */
export const PROP_DESCRIPTION_MAX_CHARS = 120
/** Cap on serialised type / signature strings emitted into the registry. */
export const TYPE_MAX_CHARS = 240
