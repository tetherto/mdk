// The mdk-ui-component skill's component reference, split so an agent reads a small index first and
// then only the entries it uses, instead of the devkit's whole registry (about 290 KB) every time.
//
//   index.json              schema and package versions, component names by category, hook and type names
//   components/<Name>.json  one entry of the devkit registry's `components`, verbatim
//   hooks/<name>.json       one entry of `hooks`, verbatim
//   types/<Name>.json       one entry of `types`, verbatim
//
// The registry's `indexes` are not copied: componentsByCategory is in index.json, and every other
// index is a field each entry already carries (tier, domainContext, public).
//
// Shared by sync-ui-registry.mjs (writes it), diff-ui-registry.mjs (explains a stale copy) and the
// mdk-skill tests (read it), so the layout is defined once.

import fs from 'node:fs'
import path from 'node:path'

export const INDEX_FILE = 'index.json'
export const KINDS = ['components', 'hooks', 'types']

// Move on every build or commit without the content changing.
export const PROVENANCE_FIELDS = ['generatedAt', 'generatedFrom']

// Entry names become file names. Registry names are TypeScript identifiers, so anything else means
// the registry's shape changed and the layout needs a decision, not a silently mangled file name.
const SAFE_NAME = /^[A-Za-z_$][A-Za-z0-9_$]*$/

const toJson = (value) => `${JSON.stringify(value)}\n`

/** Why `manifest` cannot be split, or null when it can. */
export function splitProblem (manifest) {
  for (const kind of KINDS) {
    if (!Array.isArray(manifest[kind])) return `it has no \`${kind}\` list`
    const seen = new Map()
    for (const entry of manifest[kind]) {
      const name = entry?.name
      if (typeof name !== 'string' || !SAFE_NAME.test(name)) return `${kind} entry ${JSON.stringify(name)} is not a usable file name`
      // Two names that differ only in case would overwrite each other on macOS and Windows.
      const key = name.toLowerCase()
      if (seen.has(key)) return `${kind} entries ${seen.get(key)} and ${name} would share a file`
      seen.set(key, name)
    }
  }
  return null
}

/** Every file of the split reference, as { relative path: content }, from a devkit registry manifest. */
export function splitRegistry (manifest) {
  const problem = splitProblem(manifest)
  if (problem) throw new Error(`cannot split the registry: ${problem}`)

  const componentsByCategory = {}
  for (const c of manifest.components) {
    const category = c.category ?? 'uncategorized'
    if (!componentsByCategory[category]) componentsByCategory[category] = []
    componentsByCategory[category].push(c.name)
  }

  const index = {
    version: manifest.version,
    package: manifest.package,
    packageVersion: manifest.packageVersion,
    generatedAt: manifest.generatedAt,
    generatedFrom: manifest.generatedFrom,
    componentsByCategory,
    hooks: manifest.hooks.map((h) => h.name),
    types: manifest.types.map((t) => t.name)
  }

  const files = new Map([[INDEX_FILE, toJson(index)]])
  for (const kind of KINDS) {
    for (const entry of manifest[kind]) files.set(`${kind}/${entry.name}.json`, toJson(entry))
  }
  return files
}

/** Every file under `dir`, as { relative path with forward slashes: content }; empty when `dir` is missing. */
export function readSplitFiles (dir) {
  const files = new Map()
  if (!fs.existsSync(dir)) return files
  const walk = (sub) => {
    for (const entry of fs.readdirSync(path.join(dir, sub), { withFileTypes: true })) {
      const rel = sub ? `${sub}/${entry.name}` : entry.name
      if (entry.isDirectory()) walk(rel)
      else files.set(rel, fs.readFileSync(path.join(dir, rel), 'utf8'))
    }
  }
  walk('')
  return files
}

/** The split reference parsed back: `index` plus a name-keyed Map per kind. */
export function readSplitRegistry (dir) {
  const files = readSplitFiles(dir)
  if (!files.has(INDEX_FILE)) throw new Error(`${path.join(dir, INDEX_FILE)} is missing`)
  const out = { index: JSON.parse(files.get(INDEX_FILE)) }
  for (const kind of KINDS) out[kind] = new Map()
  for (const [rel, text] of files) {
    const [kind, file] = rel.split('/')
    if (!out[kind] || !file?.endsWith('.json')) continue
    out[kind].set(file.slice(0, -'.json'.length), JSON.parse(text))
  }
  return out
}

/** True when `dir` holds exactly the files `manifest` splits into, ignoring the index's provenance fields. */
export function splitIsCurrent (dir, manifest) {
  const onDisk = readSplitFiles(dir)
  let previous
  try {
    previous = JSON.parse(onDisk.get(INDEX_FILE) ?? '')
  } catch {
    return false
  }
  // Render with the committed provenance, so only a change a reader depends on counts.
  const kept = Object.fromEntries(PROVENANCE_FIELDS.map((f) => [f, previous[f]]))
  const wanted = splitRegistry({ ...manifest, ...kept })
  if (wanted.size !== onDisk.size) return false
  for (const [rel, text] of wanted) if (onDisk.get(rel) !== text) return false
  return true
}

/** Replaces `dir` with the split of `manifest`, so an entry the registry dropped leaves no file behind. */
export function writeSplitRegistry (dir, manifest) {
  const files = splitRegistry(manifest)
  fs.rmSync(dir, { recursive: true, force: true })
  for (const [rel, text] of files) {
    const target = path.join(dir, rel)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, text)
  }
  return files
}
