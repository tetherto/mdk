#!/usr/bin/env node
// Regenerates every page in this repo that is written by a script rather than by a person,
// and reports whether any of them is out of date.
//
//   npm run regenerate-docs              rewrite every generated page
//   npm run regenerate-docs -- --check   report what is stale, change nothing
//
// Exit codes: 0 everything current, 3 pages are stale, 1 something went wrong (a generator
// crashed, the tree was dirty, bad arguments). Callers that treat staleness and breakage
// differently read the code rather than the output; the docs-freshness workflow warns on 3 and
// fails on 1.
//
// This is a wrapper. Every generator also runs on its own, with the command named in its target's
// DO NOT EDIT header; reach for that when you have changed one thing. A full run rebuilds the
// devkit registry, so it needs ui/'s dependencies and can pull an unrelated diff into a narrow
// pull request. Adding a generator here is one entry in TARGETS.
//
// Only committed files belong here. Build artifacts under dist/ are gitignored and rebuilt on every
// build, so they cannot go stale in the repo; the export baselines under ui/api-surface/ are
// refreshed deliberately via `npm run check:api-surface -- --update`, because their diff is the
// record of what a release breaks.
//
// This script orchestrates. Each generator is owned and run where it lives, so engineering keeps
// ownership of the generation logic and the hardware catalogue keeps its schema validation.

import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { EXIT_PREREQUISITE } from './sync-ui-registry.mjs'

// Staleness is a reportable state, not a breakage, so it gets its own code.
const EXIT_STALE = 3

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(HERE, '../..')

// Every generated target in one place: adding a future generator is a single entry.
const TARGETS = [
  {
    key: 'hardware',
    label: 'Supported hardware page',
    cwd: '.',
    command: ['npm', ['run', 'generate:catalogue']],
    paths: ['backend/workers/docs/supported-hardware.md', 'backend/workers/docs/catalogue.json']
  },
  {
    key: 'plugins',
    label: 'Supported plugins page',
    cwd: '.',
    command: ['npm', ['run', 'generate:plugin-reference']],
    paths: ['docs/reference/supported-plugins.md', 'backend/plugins/docs/plugins.json']
  },
  {
    key: 'packages',
    label: 'Package reference page',
    cwd: '.',
    command: ['npm', ['run', 'generate:package-catalog']],
    paths: ['docs/reference/packages.md']
  },
  {
    key: 'ui-registry',
    label: 'Component reference in the mdk-ui-component skill',
    cwd: '.',
    command: ['npm', ['run', 'generate:ui-registry']],
    paths: ['packages/mdk-skill/src/skills/mdk-ui-component/references/ui-registry.json'],
    // Needs ui/'s dependencies, which a docs-only checkout may not have.
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
    // Needs ui/'s dependencies, which a docs-only checkout may not have.
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

function main () {
  const argv = process.argv.slice(2)
  const check = argv.includes('--check')

  const unknown = argv.filter((a) => a !== '--check')
  if (unknown.length > 0) {
    console.error(`[regenerate-docs] unrecognised argument(s): ${unknown.join(', ')}`)
    console.error('[regenerate-docs] usage: regenerate-docs [--check]')
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
    // Restore the tree to exactly how it was found.
    const restore = git(['checkout', '--', ...allPaths])
    if (restore.status !== 0) {
      console.error('[regenerate-docs] could not restore the generated files after checking:')
      console.error(restore.stderr.trim())
      console.error('[regenerate-docs] run `git checkout -- <path>` on the files listed above before continuing.')
      process.exit(1)
    }
  }

  log('\n[regenerate-docs] summary')
  for (const { target, status, reason } of results) {
    if (status === 'skipped') {
      warn(`${target.label}: SKIPPED, ui/ dependencies are not installed. Run \`npm run setup:ui\` to include it.`)
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

  if (failed.length > 0) {
    console.error(`\n[regenerate-docs] ${failed.length} generator(s) failed.`)
    process.exit(1)
  }

  if (check && stale.length > 0) {
    console.error('\n[regenerate-docs] these generated files are out of date:')
    for (const s of stale) console.error(`    ${s.path}`)
    console.error('[regenerate-docs] run `npm run regenerate-docs` and commit the result.')
    process.exit(EXIT_STALE)
  }

  // A skip is reported, not fatal. Installing ui/'s dependencies costs hundreds of megabytes, which
  // is a lot to ask of someone who only edits Markdown, and the targets that need no ui/ install
  // still get checked. Where every target must genuinely run, the caller enforces it: the docs-freshness
  // workflow treats a skip as a failure, because there it means the install broke.
  if (check && skipped.length > 0) {
    log(`\n[regenerate-docs] ${skipped.length} target(s) skipped, so this run does not cover every generated file.`)
  }

  log(check ? '\n[regenerate-docs] every generated file checked is current.' : '\n[regenerate-docs] done.')
}

main()
