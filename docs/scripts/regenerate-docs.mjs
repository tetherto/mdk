#!/usr/bin/env node
// Regenerates every page in this repo that is written by a script rather than by a person,
// and reports whether any of them is out of date.
//
//   npm run regenerate-docs                   rewrite every generated page
//   npm run regenerate-docs -- --check        report what is stale, change nothing
//   npm run regenerate-docs -- --allow-skip   carry on when a target cannot run, and say so
//
// A target that cannot run is a failure by default, because the exit code is the whole verdict: a
// run that exits 0 having checked two of four targets says something it has not earned.
//
// Exit codes: 0 everything current, 3 pages are stale, 1 something went wrong (a generator
// crashed, the tree was dirty, bad arguments, or a target could not run). Callers that treat
// staleness and breakage differently read the code rather than the output; the docs-freshness
// workflow blocks on 3 and on 1, with a different message for each.
//
// This is a wrapper. Every generator also runs on its own, with the command named in its target's
// DO NOT EDIT header; reach for that when you have changed one thing. A full run rebuilds the
// devkit registry, so it needs ui/'s dependencies and can pull an unrelated diff into a narrow
// pull request. Adding a generator here is one entry in TARGETS.
//
// Only committed files belong in TARGETS; the export baselines under ui/api-surface/ are refreshed
// deliberately via `npm run check:api-surface -- --update`, because their diff is the record of what
// a release breaks.
//
// A full run does also refresh gitignored build artifacts, as a product of the devkit build
// ensureDevkitRegistry() runs. Three of them, one per package in the devkit's build subgraph:
// ui/packages/react-devkit/dist/registry.json, and — because the devkit depends on
// @tetherto/mdk-react-adapter and @tetherto/mdk-ui-foundation, and turbo builds a dependency
// before its dependent — ui/packages/react-adapter/dist/hooks.json and
// ui/packages/ui-foundation/dist/stores.json. ui/AGENTS.md carries the full table. None can go
// stale in this repo, which tracks none of them — but the docs site reads them out of a local
// checkout of it, where nothing rebuilds them. `npm run regenerate-docs` refreshes them there.
//
// This script orchestrates. Each generator runs where it lives: the hardware catalogue sits beside
// the contracts it reads and calls engineering's schema validator. Placement and whose validator a
// generator calls are not the same question as who maintains it — these generators are maintained
// with the docs they feed.

import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { EXIT_PREREQUISITE } from './sync-ui-registry.mjs'
import { outputPaths } from './generate-api-reference.mjs'

// Staleness is a reportable state, not a breakage, so it gets its own code.
export const EXIT_STALE = 3

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(HERE, '../..')

// Every generated target in one place: adding a future generator is a single entry.
export const TARGETS = [
  {
    key: 'hardware',
    label: 'Supported Workers page',
    cwd: '.',
    command: ['npm', ['run', 'generate:catalogue']],
    paths: ['backend/workers/docs/supported-workers.md', 'backend/workers/docs/catalogue.json']
  },
  {
    key: 'packages',
    label: 'Package reference page',
    cwd: '.',
    command: ['npm', ['run', 'generate:package-catalog']],
    paths: ['docs/reference/packages.md']
  },
  {
    key: 'api-reference',
    label: 'Gateway and app HTTP API references, and the route-table field reference',
    cwd: '.',
    command: ['npm', ['run', 'generate:api-reference']],
    // The generator's own list of the files it writes: files, not folders, so a hand-written file
    // beside them never reads as stale, and adding an app is one config entry.
    paths: outputPaths()
  },
  {
    key: 'ui-registry',
    label: 'Component reference in the mdk-ui-component skill',
    cwd: '.',
    command: ['npm', ['run', 'generate:ui-registry']],
    // The split folder, which the sync rewrites whole so a removed entry's file goes too, and the
    // single ui-registry.json it replaced, which the sync deletes. One wildcard pathspec covers
    // both, so --check restores the old file on a branch that still tracks it, and a literal path
    // that matches nothing never makes the restore fail where it is gone.
    paths: ['packages/mdk-skill/src/skills/mdk-ui-component/references/ui-registry*'],
    // Needs ui/'s dependencies, so it skips on a checkout that has not installed them.
    skippable: true
  },
  {
    key: 'usage-proptables',
    label: 'Generated props sections in devkit USAGE.md files',
    cwd: '.',
    command: ['npm', ['run', 'generate:usage-proptables']],
    // A glob pathspec, deliberately NOT the src/ directory: diffing the whole
    // directory would let any dirty source file abort --check or read as stale.
    paths: [':(glob)ui/packages/react-devkit/src/**/USAGE.md'],
    // Needs ui/'s dependencies, so it skips on a checkout that has not installed them.
    skippable: true
  }
]

const log = (msg) => console.log(msg)
const warn = (msg) => console.log(`  ! ${msg}`)

function git (args) {
  return spawnSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8' })
}

// Paths that differ from HEAD right now.
function changedPaths (paths) {
  const res = git(['status', '--porcelain', '--', ...paths])
  if (res.status !== 0) return []
  return res.stdout
    .split('\n')
    .map((line) => line.slice(3).trim())
    .filter(Boolean)
}

function runTarget (target) {
  const [cmd, args] = target.command
  const res = spawnSync(cmd, args, {
    cwd: path.join(REPO_ROOT, target.cwd),
    stdio: 'inherit',
    shell: process.platform === 'win32'
  })
  if (res.error) return { status: 'failed', reason: res.error.message }
  if (res.status === EXIT_PREREQUISITE && target.skippable) return { status: 'skipped' }
  if (res.status !== 0) return { status: 'failed', reason: `exited ${res.status}` }
  return { status: 'ok' }
}

// The exit code is the whole verdict, so the precedence between outcomes is the contract: a
// generator that failed outranks a target that could not run, which outranks a stale page. A run
// that is both skipped and stale exits 1 rather than EXIT_STALE, because the skip means the run
// never covered every target and its staleness answer is therefore partial. Pure and exported so
// the whole table can be asserted without spawning a generator or a devkit build; main() keeps the
// diagnostics, which is why this takes counts rather than the result objects.
export function verdict ({ failed = 0, skipped = 0, stale = 0, allowSkip = false } = {}) {
  if (failed > 0) return 1
  if (skipped > 0 && !allowSkip) return 1
  if (stale > 0) return EXIT_STALE
  return 0
}

function main () {
  const argv = process.argv.slice(2)
  const check = argv.includes('--check')
  const allowSkip = argv.includes('--allow-skip')

  const unknown = argv.filter((a) => a !== '--check' && a !== '--allow-skip')
  if (unknown.length > 0) {
    console.error(`[regenerate-docs] unrecognised argument(s): ${unknown.join(', ')}`)
    console.error('[regenerate-docs] usage: regenerate-docs [--check] [--allow-skip]')
    process.exit(1)
  }

  const allPaths = TARGETS.flatMap((t) => t.paths)

  // In report mode a pre-existing edit is indistinguishable from a stale page, so decline rather
  // than report a false positive, and never discard someone's work in progress.
  if (check) {
    const dirty = changedPaths(allPaths)
    if (dirty.length > 0) {
      console.error('[regenerate-docs] --check needs the generated files to match the last commit, but these carry uncommitted edits:')
      for (const p of dirty) console.error(`    ${p}`)
      console.error('[regenerate-docs] commit or stash them, then re-run. Nothing was changed.')
      process.exit(1)
    }
  }

  log(check ? '[regenerate-docs] checking generated pages (nothing will be changed)' : '[regenerate-docs] regenerating generated pages')

  const results = []
  for (const target of TARGETS) {
    log(`\n[regenerate-docs] ${target.label}`)
    // Run every target even after a failure, so one broken source file cannot hide a second problem.
    results.push({ target, ...runTarget(target) })
  }

  // Each entry records which target owns the stale path: a path cannot be
  // matched back to its target afterwards, because a target's `paths` may be a
  // pathspec (the USAGE.md glob) that no literal file path string equals.
  const stale = []
  if (check) {
    for (const { target, status } of results) {
      if (status !== 'ok') continue
      for (const p of changedPaths(target.paths)) stale.push({ key: target.key, path: p })
    }
    // Restore the tree to exactly how it was found. checkout brings back changed and deleted files;
    // clean removes the ones a generator added (a new component's file, say). Nothing untracked
    // was there before: the dirty check above refuses to start if it was.
    const restore = git(['checkout', '--', ...allPaths])
    const clean = restore.status === 0 ? git(['clean', '-fdq', '--', ...allPaths]) : restore
    if (clean.status !== 0) {
      console.error('[regenerate-docs] could not restore the generated files after checking:')
      console.error(clean.stderr.trim())
      console.error('[regenerate-docs] run `git checkout -- <path>` and `git clean -fd -- <path>` on the files listed above before continuing.')
      process.exit(1)
    }
  }

  log('\n[regenerate-docs] summary')
  for (const { target, status, reason } of results) {
    if (status === 'skipped') {
      warn(`${target.label}: SKIPPED, ui/ dependencies are not installed. Run \`npm run setup\` to include it.`)
    } else if (status === 'failed') {
      warn(`${target.label}: FAILED (${reason})`)
    } else if (check) {
      const own = stale.filter((s) => s.key === target.key)
      log(own.length > 0 ? `  x ${target.label}: out of date` : `  ok ${target.label}: current`)
    } else {
      log(`  ok ${target.label}: ${target.paths.join(', ')}`)
    }
  }

  const failed = results.filter((r) => r.status === 'failed')
  const skipped = results.filter((r) => r.status === 'skipped')
  const code = verdict({ failed: failed.length, skipped: skipped.length, stale: stale.length, allowSkip })

  // These branches mirror verdict()'s precedence so the message names whatever decided the code.
  // A target that could not run is a failure, because the exit code means what it says.
  // CONTRIBUTING's only documented setup (`npm run setup`) installs ui/, so a skip is an incomplete
  // install, not a way of working this supports. --allow-skip is for a checkout mid-setup that
  // still wants the targets it can run: it reports the skip and carries on to the staleness answer.
  if (failed.length > 0) {
    console.error(`\n[regenerate-docs] ${failed.length} generator(s) failed.`)
  } else if (skipped.length > 0 && !allowSkip) {
    console.error(`\n[regenerate-docs] ${skipped.length} target(s) could not run, so this run did not cover every generated file:`)
    for (const { target } of skipped) console.error(`    ${target.label}`)
    console.error('[regenerate-docs] run `npm run setup` to install them, or pass --allow-skip to accept partial coverage.')
  } else {
    if (skipped.length > 0) {
      log(`\n[regenerate-docs] ${skipped.length} target(s) skipped, so this run does not cover every generated file.`)
    }
    if (stale.length > 0) {
      console.error('\n[regenerate-docs] these generated files are out of date:')
      for (const s of stale) console.error(`    ${s.path}`)
      console.error('[regenerate-docs] run `npm run regenerate-docs` and commit the result.')
    }
  }

  if (code !== 0) process.exit(code)

  log(check ? '\n[regenerate-docs] every generated file checked is current.' : '\n[regenerate-docs] done.')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
