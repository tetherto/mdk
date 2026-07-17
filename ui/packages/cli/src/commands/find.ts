import { loadRegistry, type Tier, TIERS } from '../registry-loader.js'

export type FindCommandOptions = {
  packageName: string
  /** Filter by Kernel capability identifier. */
  capability?: string
  /** Filter by mining domain. */
  domain?: string
  /** Filter by category bucket. */
  category?: string
  /** Filter by audience tier. Defaults to `agent-ready`. Pass `"all"` to drop. */
  tier?: Tier | 'all'
  /** Filter to components or hooks only. */
  kind?: 'components' | 'hooks' | 'all'
  format?: 'json' | 'table'
  cwd?: string
  out?: (line: string) => void
}

/**
 * Generic facet matcher: an undefined `filter` is always a pass; otherwise
 * the `predicate` decides. Lets `capability` (array membership), `domain`
 * and `category` (equality) all share one implementation.
 */
const matches = <TValue, TFilter>(
  value: TValue,
  filter: TFilter | undefined,
  predicate: (value: TValue, filter: TFilter) => boolean,
): boolean => filter === undefined || predicate(value, filter)

const matchesTier = (entryTier: Tier | undefined, want: Tier | 'all'): boolean => {
  if (want === 'all') return true
  const effective = entryTier ?? 'advanced'
  return effective === want
}

const filterEntries = <
  T extends { tier?: Tier; kernelCapabilities?: string[]; domainContext?: string; category?: string },
>(
  entries: T[],
  opts: FindCommandOptions,
): T[] => {
  const tier = opts.tier ?? TIERS.agentReady
  return entries.filter(
    (entry) =>
      matchesTier(entry.tier, tier) &&
      matches(entry.kernelCapabilities, opts.capability, (caps, cap) => !!caps?.includes(cap)) &&
      matches(entry.domainContext, opts.domain, (dom, want) => dom === want) &&
      matches(entry.category, opts.category, (cat, want) => cat === want),
  )
}

const padRight = (s: string, n: number): string =>
  s.length >= n ? `${s.slice(0, n - 1)}…` : s.padEnd(n)

/**
 * Filter the registry by capability / domain / category / tier and emit the
 * matching components and hooks. The agent-friendly entry point for "given
 * what I want, narrow the surface".
 */
export const runFind = (opts: FindCommandOptions): void => {
  const out =
    opts.out ??
    ((s: string) => {
      // eslint-disable-next-line no-console
      console.log(s)
    })
  const { registry } = loadRegistry({ packageName: opts.packageName, cwd: opts.cwd })
  const kind = opts.kind ?? 'all'
  const format = opts.format ?? 'json'

  const components = kind === 'hooks' ? [] : filterEntries(registry.components, opts)
  const hooks = kind === 'components' ? [] : filterEntries(registry.hooks, opts)

  if (format === 'json') {
    out(JSON.stringify({ components, hooks }, null, 2))
    return
  }

  if (components.length > 0) {
    out('Components:')
    out(
      `${padRight('Name', 32)}${padRight('Tier', 13)}${padRight('Category', 14)}${padRight('Domain', 20)}Capabilities`,
    )
    out('-'.repeat(120))
    for (const c of components) {
      out(
        `${padRight(c.name, 32)}${padRight(c.tier ?? 'advanced', 13)}${padRight(
          c.category ?? '-',
          14,
        )}${padRight(c.domainContext ?? '-', 20)}${(c.kernelCapabilities ?? []).join(', ')}`,
      )
    }
    out('')
  }
  if (hooks.length > 0) {
    out('Hooks:')
    out(`${padRight('Name', 32)}${padRight('Tier', 13)}${padRight('Domain', 20)}Capabilities`)
    out('-'.repeat(120))
    for (const h of hooks) {
      out(
        `${padRight(h.name, 32)}${padRight(h.tier ?? 'advanced', 13)}${padRight(
          h.domainContext ?? '-',
          20,
        )}${(h.kernelCapabilities ?? []).join(', ')}`,
      )
    }
  }
  if (components.length === 0 && hooks.length === 0) {
    out('(no matches)')
  }
}
