#!/usr/bin/env node
// Regenerates the mdk-ui-component skill's component reference from the devkit's registry.
//
// Source of truth: ui/packages/react-devkit/dist/registry.json, itself generated from JSDoc tags,
// USAGE.md files and examples in the devkit's source. The skill ships a committed copy so an agent
// that installed the suite alone still has component props to read.
//
// The copy is verbatim. Trimming it would create a second shape to keep in step with the devkit's
// registry schema, and the skill already ships the file at full size.
//
// Prerequisite: ui/'s dependencies, since build:registry runs through tsx. Without them this exits
// with EXIT_PREREQUISITE and leaves the committed copy untouched, so a docs-only checkout reports a
// skip rather than writing a partial file.
//
// The build goes through turbo, not `npm run` in the devkit alone. The generator resolves the
// devkit's imports from mdk-ui-foundation and mdk-react-adapter through their dist/ type output;
// turbo's build:registry -> build:ts -> ^build:ts chain builds those first. Calling the devkit's
// script directly on an unbuilt checkout resolves every such import to `any` and writes a registry
// that never matches one produced from a built tree.
//
// Usage: `npm run generate:ui-registry` from the repo root. `npm run regenerate-docs` runs it alongside
// the repo's other generators.

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(HERE, '../..')
const UI_ROOT = path.join(REPO_ROOT, 'ui')
const REGISTRY = path.join(UI_ROOT, 'packages/react-devkit/dist/registry.json')
const TARGET = path.join(REPO_ROOT, 'packages/mdk-skill/src/skills/mdk-ui-component/references/ui-registry.json')

// Distinct from 1 so the regenerate-docs orchestrator can tell "not set up for this" from "broken".
export const EXIT_PREREQUISITE = 2

const rel = (p) => path.relative(REPO_ROOT, p)
const log = (msg) => console.log(`[sync-ui-registry] ${msg}`)
const fail = (msg, code = 1) => {
  console.error(`[sync-ui-registry] ${msg}`)
  process.exit(code)
}

// Shared with generate-usage-proptables.mjs — every consumer of the registry must
// build it the same way (through turbo, so sibling dist/ types exist) or prop
// types silently resolve to `any`. Exits EXIT_PREREQUISITE on a docs-only checkout.
export function ensureDevkitRegistry () {
  if (!fs.existsSync(path.join(UI_ROOT, 'node_modules'))) {
    fail(`ui/ dependencies are not installed, so the devkit registry cannot be built. Run \`npm run setup:ui\` from ${rel(REPO_ROOT) || 'the repo root'}, then re-run.`, EXIT_PREREQUISITE)
  }

  log('building the devkit registry (and the sibling packages it reads types from)')
  const build = spawnSync('npx', ['turbo', 'run', 'build:registry', '--filter=@tetherto/mdk-react-devkit'], {
    cwd: UI_ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  })
  if (build.error) fail(`could not run turbo in ${rel(UI_ROOT)}: ${build.error.message}`)
  if (build.status !== 0) fail(`turbo run build:registry exited ${build.status}; nothing was changed`)

  if (!fs.existsSync(REGISTRY)) {
    fail(`build:registry reported success but ${rel(REGISTRY)} is missing; nothing was changed`)
  }
}

function main () {
  ensureDevkitRegistry()

  const raw = fs.readFileSync(REGISTRY, 'utf8')

  // Guard against copying a truncated or half-written registry over a good committed copy.
  let manifest
  try {
    manifest = JSON.parse(raw)
  } catch (err) {
    fail(`${rel(REGISTRY)} is not valid JSON (${err.message}); the committed copy is unchanged`)
  }
  if (!Array.isArray(manifest.components) || manifest.components.length === 0) {
    fail(`${rel(REGISTRY)} carries no components; the committed copy is unchanged`)
  }
  if (!manifest.version || !manifest.packageVersion) {
    fail(`${rel(REGISTRY)} is missing its version fields; the committed copy is unchanged`)
  }

  // The registry stamps a fresh generatedAt on every build and a fresh gitSha on every commit, so a
  // byte comparison would call the committed copy stale forever and the freshness check would cry
  // wolf. Rewrite only when the content a reader depends on has actually moved.
  if (fs.existsSync(TARGET) && !contentDiffers(TARGET, manifest)) {
    log(`${rel(TARGET)} is already current (schema ${manifest.version}, ${manifest.package} ${manifest.packageVersion})`)
    return
  }

  fs.mkdirSync(path.dirname(TARGET), { recursive: true })
  fs.writeFileSync(TARGET, raw)
  log(`wrote ${rel(TARGET)} from ${rel(REGISTRY)} (schema ${manifest.version}, ${manifest.package} ${manifest.packageVersion})`)
}

// Everything except the two provenance fields that move on their own.
function substance (manifest) {
  const { generatedAt, generatedFrom, ...rest } = manifest
  return JSON.stringify(rest)
}

function contentDiffers (target, manifest) {
  try {
    return substance(JSON.parse(fs.readFileSync(target, 'utf8'))) !== substance(manifest)
  } catch {
    // An unreadable or malformed committed copy is exactly what this script is here to replace.
    return true
  }
}

// Only run when invoked directly, so regenerate-docs can import EXIT_PREREQUISITE without
// generating anything as a side effect.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
