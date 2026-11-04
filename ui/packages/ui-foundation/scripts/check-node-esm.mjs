#!/usr/bin/env node
/* oxlint-disable no-console */
/**
 * Guard the promise that `dist/` loads in plain Node, with no bundler.
 *
 * Imports every entry of this package's `exports` map by the package's own
 * name (Node resolves a package's self-reference through `exports`), so it
 * checks what a consumer actually gets: a relative or `@/` specifier `tsc`
 * emitted verbatim, an `exports` path that points nowhere, or a JSON file the
 * generator stopped writing. A `types` file that is missing fails it too.
 *
 * Runs as the last step of `npm run build`. Needs `dist/` built first.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

const failures = []
for (const [subpath, target] of Object.entries(pkg.exports)) {
  const specifier = subpath === '.' ? pkg.name : `${pkg.name}/${subpath.slice(2)}`
  const file = typeof target === 'string' ? target : target.import
  const types = typeof target === 'string' ? null : target.types
  if (types && !existsSync(join(root, types)))
    failures.push(`${subpath}: types file ${types} is missing`)
  try {
    const mod = file.endsWith('.json')
      ? await import(specifier, { with: { type: 'json' } })
      : await import(specifier)
    if (Object.keys(mod).length === 0) failures.push(`${subpath}: loaded, but exports nothing`)
  } catch (err) {
    failures.push(`${subpath}: ${err.code || err.name}: ${err.message.split('\n')[0]}`)
  }
}

if (failures.length) {
  console.error(`✗ ${pkg.name} dist/ does not load in plain Node:\n  ${failures.join('\n  ')}`)
  process.exit(1)
}
console.log(`✓ ${pkg.name}: all ${Object.keys(pkg.exports).length} exports load in plain Node`)
