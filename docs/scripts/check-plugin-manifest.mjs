#!/usr/bin/env node
// CI gate: every shipped app route table validates against the route-table
// schema owned by backend/core/app-runtime (mdk-plugin.schema.json), so a schema
// change that orphans a shipped table fails the build.
//
//   npm run check:plugin-manifest              # every tracked route table
//   node docs/scripts/check-plugin-manifest.mjs <file>...
//
// Schema only, through app-runtime's own validateRouteTable — no second
// validator. Version gating applies as at runtime: a legacy table (no
// routeTableVersion) gets the OpenAPI-shaped strict tier as warnings, a stamped
// table gets it as errors. The loader's imperative rules (non-empty values,
// unique ids and method/path pairs, leading slash) are covered by each
// package's own tests and by `mdk validate app`.
//
// Exit codes: 0 every table conforms; 1 one or more errors.

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { validateRouteTable } = require('../../backend/core/app-runtime/lib/route-table-validator')
const { PLUGIN_FILE } = require('../../backend/core/app-runtime/lib/manifest')

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

/** Tracked route tables, found by app-runtime's exported filename. */
export function shippedRouteTables () {
  return execFileSync('git', ['ls-files', `*${PLUGIN_FILE}`], { cwd: REPO_ROOT, encoding: 'utf8' })
    .split('\n')
    .filter(f => f && path.basename(f) === PLUGIN_FILE)
    .map(f => path.join(REPO_ROOT, f))
}

/** -> [{ file, ok, errors, warnings }] */
export function checkRouteTables (files) {
  return files.map((file) => {
    let table
    try {
      table = JSON.parse(readFileSync(file, 'utf8'))
    } catch (err) {
      return { file, ok: false, errors: [`not valid JSON: ${err.message}`], warnings: [] }
    }
    return { file, ...validateRouteTable(table) }
  })
}

function main (argv) {
  const files = argv.length ? argv.map(f => path.resolve(f)) : shippedRouteTables()
  if (files.length === 0) {
    console.error(`ERR_NO_ROUTE_TABLES: no tracked ${PLUGIN_FILE} found`)
    return 1
  }
  let failed = 0
  for (const r of checkRouteTables(files)) {
    const rel = path.relative(REPO_ROOT, r.file)
    console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${rel}`)
    for (const e of r.errors) console.log(`  error: ${e}`)
    for (const w of r.warnings) console.log(`  warning: ${w}`)
    if (!r.ok) failed++
  }
  console.log(`${files.length - failed}/${files.length} route tables conform`)
  return failed ? 1 : 0
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main(process.argv.slice(2))
}
