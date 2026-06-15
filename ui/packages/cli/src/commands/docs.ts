import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { findComponent, loadRegistry } from '../registry-loader.js'

export type DocsCommandOptions = {
  packageName: string
  componentName: string
  cwd?: string
  out?: (line: string) => void
}

export const runDocs = (opts: DocsCommandOptions): void => {
  const out =
    opts.out ??
    ((s: string) => {
      // eslint-disable-next-line no-console
      console.log(s)
    })

  const { registry, packageDir } = loadRegistry({
    packageName: opts.packageName,
    cwd: opts.cwd,
  })

  const component = findComponent(registry, opts.componentName)
  if (!component) {
    throw new Error(
      `Component "${opts.componentName}" not found in ${opts.packageName}'s registry.`,
    )
  }

  if (component.usageDoc) {
    const absPath = join(packageDir, component.usageDoc)
    if (existsSync(absPath)) {
      out(readFileSync(absPath, 'utf8'))
      return
    }
  }

  // Fall back to a synthesised stub from JSDoc + prop metadata.
  out(`# ${component.name}\n`)
  if (component.description) out(`${component.description}\n`)
  if (component.category) out(`Category: \`${component.category}\``)
  if (component.domainContext) out(`Domain: \`${component.domainContext}\``)
  if (component.orkCapabilities?.length)
    out(`ORK capabilities: ${component.orkCapabilities.map((c) => `\`${c}\``).join(', ')}`)
  out('')
  out('## Props\n')
  out('| Prop | Type | Required | Description |')
  out('| --- | --- | --- | --- |')
  for (const p of component.props) {
    out(`| \`${p.name}\` | \`${p.type}\` | ${p.required ? 'yes' : 'no'} | ${p.description ?? ''} |`)
  }

  if (!component.usageDoc) {
    out('')
    out('> Note: this component does not ship a co-located USAGE.md.')
    out('> The summary above was synthesised from the registry.')
  }
}
