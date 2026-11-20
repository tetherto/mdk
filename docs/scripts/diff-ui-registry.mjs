#!/usr/bin/env node
// Explains why the committed component registry differs from a freshly generated one.
//
// `regenerate-docs --check` only says that
// packages/mdk-skill/src/skills/mdk-ui-component/references/ui-registry/ is stale; it then
// restores the committed copy, so the generated one is gone from that path. The generator's own
// output survives at ui/packages/react-devkit/dist/registry.json. This script splits that registry
// the way the sync does, compares it with the committed files as JSON, ignoring the provenance
// fields (generatedAt, generatedFrom) that move on every build, and prints every leaf value that
// differs with the path to it: the file, then the JSON path inside it. Reading the list tells you which
// export changed, and whether the generated side collapsed a type to `any`, which means the
// environment that ran the generator could not resolve that type.
//
// Usage:
//   node docs/scripts/diff-ui-registry.mjs [committed-dir] [generated.json]
//
// Defaults to the committed split and the devkit's dist/registry.json. Output is Markdown so the
// docs-freshness workflow can append it to the job summary. Always exits 0: it is a diagnostic,
// not a gate.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { INDEX_FILE, PROVENANCE_FIELDS, readSplitFiles, splitRegistry } from './lib/ui-registry-split.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(HERE, '../..')

const DEFAULT_COMMITTED = 'packages/mdk-skill/src/skills/mdk-ui-component/references/ui-registry'
const DEFAULT_GENERATED = 'ui/packages/react-devkit/dist/registry.json'
const MAX_ROWS = 60
const MAX_VALUE = 120

const rel = (p) => path.relative(REPO_ROOT, p)

// { "<file>": parsed JSON } for every file of a split, with the index's provenance fields dropped.
function parseSplit (files) {
  const out = {}
  for (const [rel, text] of files) {
    const data = JSON.parse(text)
    if (rel === INDEX_FILE) for (const f of PROVENANCE_FIELDS) delete data[f]
    out[rel] = data
  }
  return out
}

// Flattens nested JSON into { "/components/3/props/0/type": value }. Arrays of components and
// hooks are keyed by name where one exists, so a reordering does not read as a change. A repeated
// name gets a "#n" suffix (second occurrence onward) so the entries stay distinct instead of
// overwriting each other and hiding a difference.
function flatten (value, prefix = '', out = new Map()) {
  if (Array.isArray(value)) {
    const seen = new Map()
    value.forEach((item, i) => {
      let key = String(i)
      if (item && typeof item === 'object' && typeof item.name === 'string') {
        const n = (seen.get(item.name) ?? 0) + 1
        seen.set(item.name, n)
        key = n === 1 ? item.name : `${item.name}#${n}`
      }
      flatten(item, `${prefix}/${key}`, out)
    })
  } else if (value && typeof value === 'object') {
    for (const k of Object.keys(value)) flatten(value[k], `${prefix}/${k}`, out)
  } else {
    out.set(prefix, value)
  }
  return out
}

const show = (v) => {
  const s = v === undefined ? '(absent)' : JSON.stringify(v)
  return s.length > MAX_VALUE ? `${s.slice(0, MAX_VALUE)}…` : s
}

function main () {
  const [a = DEFAULT_COMMITTED, b = DEFAULT_GENERATED] = process.argv.slice(2)
  const committedPath = path.resolve(REPO_ROOT, a)
  const generatedPath = path.resolve(REPO_ROOT, b)

  for (const p of [committedPath, generatedPath]) {
    if (!fs.existsSync(p)) {
      console.log(`### UI registry diff\n\n\`${rel(p)}\` is missing, so there is nothing to compare.`)
      return
    }
  }

  const committed = flatten(parseSplit(readSplitFiles(committedPath)))
  const generated = flatten(parseSplit(splitRegistry(JSON.parse(fs.readFileSync(generatedPath, 'utf8')))))
  const keys = new Set([...committed.keys(), ...generated.keys()])
  const rows = []
  for (const k of [...keys].sort()) {
    const c = committed.get(k)
    const g = generated.get(k)
    if (c !== g) rows.push({ k, c, g })
  }

  console.log('### UI registry diff\n')
  console.log(`Committed \`${rel(committedPath)}\` against generated \`${rel(generatedPath)}\`, provenance fields ignored.\n`)
  if (!rows.length) {
    console.log('No content differences. If the check still reports these files stale, the two copies differ only in generatedAt or gitSha, which the sync is meant to ignore.')
    return
  }

  const toAny = rows.filter((r) => r.g === 'any' && r.c !== 'any').length
  console.log(`${rows.length} differing value(s).${toAny ? ` ${toAny} resolved to \`any\` on the generated side: the generator could not resolve those types in this environment.` : ''}\n`)
  console.log('| Path | Committed | Generated |')
  console.log('|---|---|---|')
  for (const { k, c, g } of rows.slice(0, MAX_ROWS)) {
    console.log(`| \`${k}\` | ${show(c)} | ${show(g)} |`)
  }
  if (rows.length > MAX_ROWS) console.log(`\n…and ${rows.length - MAX_ROWS} more.`)
}

main()
