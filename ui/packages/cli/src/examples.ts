import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import type { RegistryComponent } from './registry-loader.js'

/**
 * Locate and read the first co-located example file for a registry
 * component, if any. Returns `null` when the component has no example or
 * the example path can't be resolved on disk.
 */
export const readExampleSource = (
  packageDir: string,
  component: RegistryComponent,
): { path: string; source: string } | null => {
  const examples = component.examples ?? []
  const first = examples[0]
  if (!first) return null
  const examplePath = join(packageDir, first)
  if (!existsSync(examplePath)) return null
  return { path: examplePath, source: readFileSync(examplePath, 'utf8') }
}
