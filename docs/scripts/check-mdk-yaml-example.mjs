#!/usr/bin/env node
// CI gate: the minimal `mdk.yaml` on docs/reference/mdk-yaml.md is the only copy
// of the example, and the CLI's own loader accepts it. Runs in the test-scripts
// job through test/check-mdk-yaml-example.test.mjs.
//
//   node docs/scripts/check-mdk-yaml-example.mjs           # the reference page
//   node docs/scripts/check-mdk-yaml-example.mjs <page.md>
//
// The page holds exactly one ```yaml block. That block is written to a temporary
// project and loaded with loadStackSpec from packages/cli/src/lib/spec.ts, so no
// second parser exists. The loader accepts any apiVersion and ignores unknown
// keys, so the block is also held to what buildStackSpec (`mdk onboard`) writes:
// the same apiVersion and kind, and only spec keys it knows. The page's key map
// names every top-level spec key buildStackSpec writes, and no other.
//
// Exit codes: 0 the example loads; 1 it does not.

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { tsImport } from 'tsx/esm/api'
import { parse } from 'yaml'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

/** The page that owns the example, relative to the repo root. */
export const PAGE = 'docs/reference/mdk-yaml.md'

let cli
function loadCli () {
  cli ??= tsImport(pathToFileURL(path.join(REPO_ROOT, 'packages/cli/src/lib/spec.ts')).href, import.meta.url)
  return cli
}

/** What `mdk onboard` writes, from buildStackSpec with no Workers or apps. */
async function onboardSpec () {
  const { buildStackSpec } = await loadCli()
  return buildStackSpec({ stackName: 'x', gatewayPort: 3847, kernelPort: 3848, workerBasePort: 3900, workerPackages: [], appPackages: [] })
}

/** Top-level `spec` keys `mdk onboard` writes. */
export async function stackKeys () {
  return Object.keys((await onboardSpec()).spec)
}

/** The single ```yaml block in `markdown`; throws unless there is exactly one. */
export function extractExample (markdown) {
  const blocks = [...markdown.matchAll(/^```ya?ml[^\n]*\n([\s\S]*?)^```/gm)].map(m => m[1])
  if (blocks.length !== 1) throw new Error(`expected exactly one yaml block, found ${blocks.length}`)
  return blocks[0]
}

/** `spec.<key>` names in the first column of the page's table rows. */
export function keyMapKeys (markdown) {
  return [...markdown.matchAll(/^\|\s*`spec\.([A-Za-z]+)`\s*\|/gm)].map(m => m[1])
}

/** -> { ok, errors }: the CLI loader's verdict on `yamlText`, plus the onboard checks. */
export async function checkExample (yamlText) {
  const { loadStackSpec } = await loadCli()
  const dir = mkdtempSync(path.join(tmpdir(), 'check-mdk-yaml-'))
  const errors = []
  try {
    writeFileSync(path.join(dir, 'mdk.yaml'), yamlText)
    let loaded
    try {
      loaded = loadStackSpec(dir)
    } catch (err) {
      return { ok: false, errors: [err.message.replaceAll(dir, '<project>')] }
    }
    const want = await onboardSpec()
    if (loaded.apiVersion !== want.apiVersion) errors.push(`apiVersion is ${loaded.apiVersion}; mdk onboard writes ${want.apiVersion}`)
    if (loaded.kind !== want.kind) errors.push(`kind is ${loaded.kind}; mdk onboard writes ${want.kind}`)
    const known = new Set(Object.keys(want.spec))
    for (const key of Object.keys(parse(yamlText).spec ?? {})) {
      if (!known.has(key)) errors.push(`spec.${key} is not a key mdk onboard writes`)
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
  return { ok: errors.length === 0, errors }
}

async function main (argv) {
  const file = path.resolve(REPO_ROOT, argv[0] ?? PAGE)
  const rel = path.relative(REPO_ROOT, file)
  const md = readFileSync(file, 'utf8')
  const errors = []
  try {
    errors.push(...(await checkExample(extractExample(md))).errors)
  } catch (err) {
    errors.push(err.message)
  }
  const want = await stackKeys()
  const listed = keyMapKeys(md)
  for (const key of want) if (!listed.includes(key)) errors.push(`key map has no row for spec.${key}`)
  for (const key of listed) if (!want.includes(key)) errors.push(`key map row spec.${key} is not a key mdk onboard writes`)
  console.log(`${errors.length ? 'FAIL' : 'ok  '} ${rel}`)
  for (const e of errors) console.log(`  error: ${e}`)
  return errors.length ? 1 : 0
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2))
}
