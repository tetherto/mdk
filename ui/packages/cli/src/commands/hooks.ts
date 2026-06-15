import { type AdapterHook, loadHooksManifest } from '../registry-loader.js'

export type ListHooksOptions = {
  /** Adapter package name. Defaults to `@tetherto/mdk-react-adapter`. */
  packageName?: string
  format?: 'json' | 'table'
  /** Filter to a single category. */
  category?: AdapterHook['category']
  cwd?: string
  out?: (line: string) => void
}

const DEFAULT_ADAPTER = '@tetherto/mdk-react-adapter'

const padRight = (s: string, n: number): string =>
  s.length >= n ? `${s.slice(0, n - 1)}…` : s.padEnd(n)

/**
 * Print the React hooks manifest published by `@tetherto/mdk-react-adapter`
 * (or any compatible adapter). The first call an agent makes when picking
 * the right hook for a data/UX requirement.
 */
export const runHooks = (opts: ListHooksOptions = {}): void => {
  const packageName = opts.packageName ?? DEFAULT_ADAPTER
  const out =
    opts.out ??
    ((s: string) => {
      // eslint-disable-next-line no-console
      console.log(s)
    })

  const manifest = loadHooksManifest({ packageName, cwd: opts.cwd })
  if (!manifest) {
    throw new Error(
      `dist/hooks.json not found for ${packageName}. ` +
        `Run \`npm run build --workspace ${packageName}\` first.`,
    )
  }

  const hooks = opts.category
    ? manifest.hooks.filter((h) => h.category === opts.category)
    : manifest.hooks

  const format = opts.format ?? 'json'
  if (format === 'json') {
    out(
      JSON.stringify(
        {
          version: manifest.version,
          package: manifest.package,
          provider: manifest.provider,
          hooks,
        },
        null,
        2,
      ),
    )
    return
  }

  out(`Hooks (${manifest.package}):`)
  out(`${padRight('Name', 32)}${padRight('Category', 14)}${padRight('Provider?', 11)}Signature`)
  out('-'.repeat(120))
  for (const h of hooks) {
    out(
      `${padRight(h.name, 32)}${padRight(h.category, 14)}${padRight(
        h.requiresProvider ? 'yes' : '',
        11,
      )}${h.signature}`,
    )
  }
  if (manifest.provider) {
    out('')
    out(`Provider: ${manifest.provider.name} (${manifest.provider.props.length} props)`)
  }
}
