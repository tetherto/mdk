#!/usr/bin/env node
// Regenerates the mdk-ui-component skill's component reference from the devkit's registry.
//
// Source of truth: ui/packages/react-devkit/dist/registry.json, itself generated from JSDoc tags,
// USAGE.md files and examples in the devkit's source. The skill ships a committed copy so an agent
// that installed the suite alone still has component props to read.
//
// The copy is split, not one file: references/ui-registry/index.json lists the names, and each
// component, hook and type is its own file holding its registry entry verbatim, so an agent reads
// the entries it uses rather than the whole registry (lib/ui-registry-split.mjs has the layout).
// Entries stay verbatim, so the devkit's registry schema remains the only shape to keep in step with.
//
// Prerequisite: ui/'s dependencies, since build:registry runs through tsx. Without them this exits
// with EXIT_PREREQUISITE and leaves the committed copy untouched, so a docs-only checkout reports a
// skip rather than writing a partial file.
//
// The build goes through turbo, not `npm run` in the devkit alone. The generator resolves the
// devkit's imports from mdk-ui-foundation and mdk-react-adapter through their dist/ type output;
// turbo builds those first. Calling the devkit's script directly on an unbuilt checkout resolves
// every such import to `any` and writes a registry that never matches one produced from a built tree.
//
// It runs the devkit's whole `build` (build:ts -> check:styles -> build:scss -> build:registry), not
// the `build:registry` task alone. That task depends on `build:ts`, whose `rimraf dist` deletes the
// compiled stylesheets, and nothing in its chain rebuilds them: on a turbo cache miss the devkit was
// left with no styles.css, so the catalog, the shell template and mvp-site rendered unstyled.
//
// Usage: `npm run generate:ui-registry` from the repo root. `npm run regenerate-docs` runs it alongside
// the repo's other generators.

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { splitIsCurrent, splitProblem, writeSplitRegistry } from './lib/ui-registry-split.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(HERE, '../..')
const UI_ROOT = path.join(REPO_ROOT, 'ui')
const REGISTRY = path.join(UI_ROOT, 'packages/react-devkit/dist/registry.json')
const REFERENCES = path.join(REPO_ROOT, 'packages/mdk-skill/src/skills/mdk-ui-component/references')
const TARGET = path.join(REFERENCES, 'ui-registry')
// The single-file copy this split replaced; removed when found, so a checkout never ships both.
const LEGACY_TARGET = path.join(REFERENCES, 'ui-registry.json')

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

  log('building the devkit, its registry included (and the sibling packages it reads types from)')
  const build = spawnSync('npx', ['turbo', 'run', 'build', '--filter=@tetherto/mdk-react-devkit'], {
    cwd: UI_ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  })
  if (build.error) fail(`could not run turbo in ${rel(UI_ROOT)}: ${build.error.message}`)
  if (build.status !== 0) fail(`turbo run build exited ${build.status}; nothing was changed`)

  if (!fs.existsSync(REGISTRY)) {
    fail(`the devkit build reported success but ${rel(REGISTRY)} is missing; nothing was changed`)
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
  const problem = splitProblem(manifest)
  if (problem) fail(`${rel(REGISTRY)} cannot be split: ${problem}; the committed copy is unchanged`)

  const legacy = fs.existsSync(LEGACY_TARGET)
  if (legacy) fs.rmSync(LEGACY_TARGET)

  // The registry stamps a fresh generatedAt on every build and a fresh gitSha on every commit, so a
  // byte comparison would call the committed copy stale forever and the freshness check would cry
  // wolf. Rewrite only when the content a reader depends on has actually moved.
  if (splitIsCurrent(TARGET, manifest)) {
    log(`${rel(TARGET)} is already current (schema ${manifest.version}, ${manifest.package} ${manifest.packageVersion})`)
    if (legacy) log(`removed ${rel(LEGACY_TARGET)}, which the split replaces`)
    return
  }

  const files = writeSplitRegistry(TARGET, manifest)
  log(`wrote ${files.size} files to ${rel(TARGET)} from ${rel(REGISTRY)} (schema ${manifest.version}, ${manifest.package} ${manifest.packageVersion})`)
  if (legacy) log(`removed ${rel(LEGACY_TARGET)}, which the split replaces`)
}

// Only run when invoked directly, so regenerate-docs can import EXIT_PREREQUISITE without
// generating anything as a side effect.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
