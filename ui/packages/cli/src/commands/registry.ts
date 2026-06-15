import { loadRegistry, type Registry, type Tier } from '../registry-loader.js'

export type RegistryCommandOptions = {
  packageName: string
  filter?: 'components' | 'hooks' | 'all'
  format?: 'json' | 'table'
  /**
   * Narrow to a specific tier. When omitted the default view shows all public
   * entries (agent-ready + advanced). Pass `"all"` to include internal entries.
   */
  tier?: Tier | 'all'
  /**
   * Include internal (`public: false`) entries. Equivalent to `tier: "all"`.
   * Use when you need the full registry for debugging or tooling audits.
   */
  includeInternal?: boolean
  cwd?: string
  /** Optional sink for testing — defaults to `console.log`. */
  out?: (line: string) => void
}

const padRight = (s: string, n: number): string =>
  s.length >= n ? `${s.slice(0, n - 1)}…` : s.padEnd(n)

const tierOrDefault = (tier: string | undefined): Tier => (tier as Tier | undefined) ?? 'advanced'

/** `public` is `undefined` on registries < 1.3.0 — treat those as public. */
const isPublic = (entry: { public?: boolean }): boolean => entry.public !== false

const applyFilter = (registry: Registry, tier: Tier | 'all' | 'public'): Registry => {
  if (tier === 'all') return registry
  if (tier === 'public') {
    const components = registry.components.filter(isPublic)
    const hooks = registry.hooks.filter(isPublic)
    return { ...registry, components, hooks }
  }
  const components = registry.components.filter(
    (c) => isPublic(c) && tierOrDefault(c.tier) === tier,
  )
  const hooks = registry.hooks.filter((h) => isPublic(h) && tierOrDefault(h.tier) === tier)
  return { ...registry, components, hooks }
}

const printJson = (
  registry: Registry,
  filter: NonNullable<RegistryCommandOptions['filter']>,
  out: (s: string) => void,
): void => {
  if (filter === 'components') out(JSON.stringify({ components: registry.components }, null, 2))
  else if (filter === 'hooks') out(JSON.stringify({ hooks: registry.hooks }, null, 2))
  else out(JSON.stringify(registry, null, 2))
}

const printTable = (
  registry: Registry,
  filter: NonNullable<RegistryCommandOptions['filter']>,
  out: (s: string) => void,
): void => {
  if (filter !== 'hooks') {
    out('Components:')
    out(
      `${padRight('Name', 32)}${padRight('Tier', 13)}${padRight('Category', 14)}${padRight(
        'Domain',
        20,
      )}Description`,
    )
    out('-'.repeat(120))
    for (const c of registry.components) {
      out(
        `${padRight(c.name, 32)}${padRight(tierOrDefault(c.tier), 13)}${padRight(
          c.category ?? '-',
          14,
        )}${padRight(c.domainContext ?? '-', 20)}${(c.description ?? '').slice(0, 60)}`,
      )
    }
    out('')
  }
  if (filter !== 'components') {
    out('Hooks:')
    out(`${padRight('Name', 32)}${padRight('Tier', 13)}${padRight('Domain', 20)}Description`)
    out('-'.repeat(120))
    for (const h of registry.hooks) {
      out(
        `${padRight(h.name, 32)}${padRight(tierOrDefault(h.tier), 13)}${padRight(
          h.domainContext ?? '-',
          20,
        )}${(h.description ?? '').slice(0, 60)}`,
      )
    }
  }
}

export const runRegistry = (opts: RegistryCommandOptions): void => {
  const filter = opts.filter ?? 'all'
  const format = opts.format ?? 'json'
  const tier: Tier | 'all' | 'public' = opts.includeInternal ? 'all' : (opts.tier ?? 'public')
  const out =
    opts.out ??
    ((s: string) => {
      // eslint-disable-next-line no-console
      console.log(s)
    })

  const { registry } = loadRegistry({ packageName: opts.packageName, cwd: opts.cwd })
  const filtered = applyFilter(registry, tier)

  if (format === 'json') printJson(filtered, filter, out)
  else printTable(filtered, filter, out)
}
