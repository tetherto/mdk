import { type CoreStore, loadStoresManifest } from '../registry-loader.js'

export type ListStoresOptions = {
  /** ui-foundation package name. Defaults to `@tetherto/mdk-ui-foundation`. */
  packageName?: string
  format?: 'json' | 'table'
  /** Filter to a single category. */
  category?: CoreStore['category']
  cwd?: string
  out?: (line: string) => void
}

const DEFAULT_CORE = '@tetherto/mdk-ui-foundation'

const padRight = (s: string, n: number): string =>
  s.length >= n ? `${s.slice(0, n - 1)}…` : s.padEnd(n)

/**
 * Print the Zustand stores + query helpers manifest published by
 * `@tetherto/mdk-ui-foundation`. The first call an agent makes when wiring up
 * shared state or a data fetch.
 */
export const runStores = (opts: ListStoresOptions = {}): void => {
  const packageName = opts.packageName ?? DEFAULT_CORE
  const out =
    opts.out ??
    ((s: string) => {
      // eslint-disable-next-line no-console
      console.log(s)
    })

  const manifest = loadStoresManifest({ packageName, cwd: opts.cwd })
  if (!manifest) {
    throw new Error(
      `dist/stores.json not found for ${packageName}. ` +
        `Run \`npm run build --workspace ${packageName}\` first.`,
    )
  }

  const stores = opts.category
    ? manifest.stores.filter((s) => s.category === opts.category)
    : manifest.stores

  const format = opts.format ?? 'json'
  if (format === 'json') {
    out(
      JSON.stringify(
        {
          version: manifest.version,
          package: manifest.package,
          stores,
          queryHelpers: manifest.queryHelpers,
        },
        null,
        2,
      ),
    )
    return
  }

  out(`Stores (${manifest.package}):`)
  out(
    `${padRight('Name', 24)}${padRight('Category', 16)}${padRight('State', 8)}${padRight('Actions', 9)}Factory`,
  )
  out('-'.repeat(96))
  for (const s of stores) {
    out(
      `${padRight(s.name, 24)}${padRight(s.category, 16)}${padRight(
        String(s.state.length),
        8,
      )}${padRight(String(s.actions.length), 9)}${s.factory}`,
    )
  }
  if (manifest.queryHelpers.length > 0) {
    out('')
    out('Query helpers:')
    for (const q of manifest.queryHelpers) {
      out(`  ${padRight(q.name, 24)}${q.signature}`)
    }
  }
}
