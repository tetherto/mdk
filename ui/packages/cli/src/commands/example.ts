import { readExampleSource } from '../examples.js'
import { findComponent, loadRegistry } from '../registry-loader.js'

export type ExampleCommandOptions = {
  packageName: string
  componentName: string
  cwd?: string
  out?: (line: string) => void
}

export const runExample = (opts: ExampleCommandOptions): void => {
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
  const example = readExampleSource(packageDir, component)
  if (!example) {
    throw new Error(
      `Component "${component.name}" has no co-located example. Only \`agent-ready\` components ship examples; this one is \`${component.tier ?? 'advanced'}\`. See \`${component.path}\` for the source.`,
    )
  }

  out(example.source)
}
