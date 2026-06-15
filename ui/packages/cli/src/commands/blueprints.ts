import { findBlueprint, loadBlueprints } from '../registry-loader.js'

export type ListBlueprintsOptions = {
  packageName: string
  format?: 'json' | 'table'
  cwd?: string
  out?: (line: string) => void
}

export type ShowBlueprintOptions = {
  packageName: string
  id: string
  cwd?: string
  out?: (line: string) => void
}

const padRight = (s: string, n: number): string =>
  s.length >= n ? `${s.slice(0, n - 1)}…` : s.padEnd(n)

/**
 * List every available blueprint with its domain, ORK capabilities and demo
 * route. The first call an agent makes when interpreting an intent.
 */
export const runBlueprints = (opts: ListBlueprintsOptions): void => {
  const out =
    opts.out ??
    ((s: string) => {
      // eslint-disable-next-line no-console
      console.log(s)
    })
  const manifest = loadBlueprints({ packageName: opts.packageName, cwd: opts.cwd })
  if (!manifest) {
    throw new Error(
      `dist/blueprints.json not found for ${opts.packageName}. ` +
        `Run \`npm run build --workspace ${opts.packageName}\` first.`,
    )
  }
  const format = opts.format ?? 'json'
  if (format === 'json') {
    // Pick by omission: drop the heavy `body` markdown and the source `path`
    // so the JSON view stays compact for agents and humans alike.
    out(
      JSON.stringify(
        manifest.blueprints.map(({ body: _body, path: _path, ...summary }) => summary),
        null,
        2,
      ),
    )
    return
  }
  out('Blueprints:')
  out(`${padRight('Id', 36)}${padRight('Domain', 22)}Title`)
  out('-'.repeat(110))
  for (const b of manifest.blueprints) {
    out(`${padRight(b.id, 36)}${padRight(b.domain, 22)}${b.title}`)
  }
}

/**
 * Print a single blueprint's markdown body (including frontmatter). This is
 * what an agent loads into context after picking a starting recipe.
 */
export const runBlueprint = (opts: ShowBlueprintOptions): void => {
  const out =
    opts.out ??
    ((s: string) => {
      // eslint-disable-next-line no-console
      console.log(s)
    })
  const manifest = loadBlueprints({ packageName: opts.packageName, cwd: opts.cwd })
  if (!manifest) {
    throw new Error(
      `dist/blueprints.json not found for ${opts.packageName}. ` +
        `Run \`npm run build --workspace ${opts.packageName}\` first.`,
    )
  }
  const bp = findBlueprint(manifest, opts.id)
  if (!bp) {
    const ids = manifest.blueprints.map((b) => b.id).join(', ')
    throw new Error(`Blueprint "${opts.id}" not found. Known: ${ids}`)
  }
  out(`# ${bp.title}`)
  out('')
  out(`Intent: ${bp.intent}`)
  out(`Domain: ${bp.domain}`)
  if (bp.orkCapabilities.length) out(`ORK capabilities: ${bp.orkCapabilities.join(', ')}`)
  out(`Components: ${bp.components.join(', ')}`)
  if (bp.hooks.length) out(`Hooks: ${bp.hooks.join(', ')}`)
  if (bp.demoRoute) out(`Demo route: ${bp.demoRoute}`)
  out('')
  out('---')
  out('')
  out(bp.body)
}
