#!/usr/bin/env node
// Moves the whole release line to one version and resyncs everything that follows from it.
//
// Usage: npm run release:bump -- <version> [--dry-run] [--skip-registry] [--offline]
//
// What it does, in order:
//   1. every package.json on the line gets `version` = <version>, and every internal
//      @tetherto/mdk-* `^X` pin, in all four dependency fields, becomes ^<version>
//   2. every mdk-app.yaml gets `version:` = <version>, except fixtures and the scaffold template,
//      which stay at SCAFFOLD_APP_VERSION (0.1.0)
//   3. the README release links and every link into this repository's tree move to v<version>, so docs
//      read at the tag, on npm or on the docs site show that release's code. What is left alone:
//      listRepoLinkFiles and mapProse in docs/scripts/lib/repo-links.mjs
//   4. every package-lock.json is regenerated
//   5. the mdk-ui-component skill's UI registry is regenerated (--skip-registry to leave it)
//   6. the Gateway and app HTTP API references are regenerated, since the Gateway's carries its version
//   7. release:check runs; the script exits 1 if it finds anything
//
// It never commits, tags, or publishes. --dry-run lists the edits and writes nothing.
// Afterwards: draft the changelog (skills/changelog), dry-run the publish plan, and review the diff.

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { HISTORY, listRepoLinkFiles, mapProse } from '../../docs/scripts/lib/repo-links.mjs'
import { EXIT_PREREQUISITE } from '../../docs/scripts/sync-ui-registry.mjs'
import { runChecks } from './check.mjs'
import {
  OFF_LINE,
  REPO_ROOT,
  applyAppBump,
  applyBump,
  assertSemver,
  listAppManifests,
  listManifests,
  lockDirs,
  regenerateLock,
  rootVersion,
  writeManifest,
} from './lib.mjs'

const TAG_URL = 'https://github.com/tetherto/mdk/releases/tag/v'

// A link into this repository's tree on main or on any release tag: the URL family REPO_URL names in
// docs/scripts/lib/repo-links.mjs. Other repositories, release pages and refs containing a slash
// (release/x.y.z) never match. The ref must end the URL or meet / # ? ) ] a quote, a backtick, > or
// whitespace, or sentence punctuation followed by whitespace, so a branch such as mainline is not moved.
const REPO_LINK = /(https:\/\/github\.com\/tetherto\/mdk\/(?:blob|tree)\/|https:\/\/raw\.githubusercontent\.com\/tetherto\/mdk\/)(?:main|v\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?)(?=[/#?)\]\s"'`>]|[.,;:](?:\s|$)|$)/gm

// Pure: every link into this repository's tree, pinned to v<version>.
export function pinRepoLinks(text, version) {
  return text.replace(REPO_LINK, `$1v${version}`)
}

// Tracked files carrying a link pinRepoLinks may move: the ones the link check reads, minus changelogs.
const repoLinkFiles = () => listRepoLinkFiles({ cwd: REPO_ROOT, exclude: HISTORY.flatMap((p) => [p, `${p}/**`]) })

// Pure: README release links from `from` to `to`.
export function bumpReadme(text, from, to) {
  return text.replaceAll(`${TAG_URL}${from}`, `${TAG_URL}${to}`).replaceAll(`[v${from}]`, `[v${to}]`)
}

function main() {
  const args = process.argv.slice(2)
  const flag = (name) => args.includes(`--${name}`)
  const version = args.find((a) => !a.startsWith('--'))
  const dryRun = flag('dry-run')

  assertSemver(version)
  const from = rootVersion()
  console.log(`${dryRun ? '[dry run] ' : ''}release line ${from} -> ${version}`)

  // By path: README.md is edited twice, once for its release links and once for its pins.
  const edited = new Set()
  for (const { file, json } of listManifests()) {
    if (OFF_LINE.has(file)) continue
    const changes = applyBump(json, version)
    if (!changes.length) continue
    edited.add(file)
    console.log(`  ${file}: ${changes.length} change(s)`)
    if (!dryRun) writeManifest(file, json)
  }

  for (const { file, text, version: v } of listAppManifests()) {
    const next = applyAppBump(text, version)
    if (next === null) continue
    edited.add(file)
    console.log(`  ${file}: version ${v} -> ${version}`)
    if (!dryRun) fs.writeFileSync(path.join(REPO_ROOT, file), next)
  }

  {
    const abs = path.join(REPO_ROOT, 'README.md')
    const text = fs.readFileSync(abs, 'utf8')
    const next = bumpReadme(text, from, version)
    if (next !== text) {
      edited.add('README.md')
      console.log('  README.md: updated')
      if (!dryRun) fs.writeFileSync(abs, next)
    }
  }

  let pinned = 0
  for (const file of repoLinkFiles()) {
    const abs = path.join(REPO_ROOT, file)
    const text = fs.readFileSync(abs, 'utf8')
    const pin = (part) => pinRepoLinks(part, version)
    const next = file.endsWith('.md') ? mapProse(text, pin) : pin(text)
    if (next === text) continue
    edited.add(file)
    pinned++
    if (!dryRun) fs.writeFileSync(abs, next)
  }
  if (pinned) console.log(`  ${pinned} file(s): repository links pinned to v${version}`)

  if (dryRun) {
    console.log(`[dry run] ${edited.size} file(s) would change; nothing written`)
    return
  }

  for (const dir of lockDirs()) {
    console.log(`  regenerating ${dir}/package-lock.json`)
    regenerateLock(dir)
  }

  if (!flag('skip-registry')) {
    const r = spawnSync('npm', ['run', 'generate:ui-registry'], { cwd: REPO_ROOT, stdio: 'inherit' })
    if (r.status === EXIT_PREREQUISITE) console.warn('  UI registry skipped (ui/ dependencies not installed); run `npm run generate:ui-registry` later')
    else if (r.status !== 0) throw new Error('npm run generate:ui-registry failed; fix it or rerun with --skip-registry')
  }

  // The Gateway's OpenAPI document carries the Gateway package version, so a bump changes it.
  const api = spawnSync('npm', ['run', 'generate:api-reference'], { cwd: REPO_ROOT, stdio: 'inherit' })
  if (api.status !== 0) throw new Error('npm run generate:api-reference failed')

  return runChecks({ version, offline: flag('offline') }).then(({ problems }) => {
    for (const p of problems) console.log(p)
    if (problems.length) {
      console.error(`release:check found ${problems.length} problem(s)`)
      process.exit(1)
    }
    console.log(`release:check OK. ${version} is staged in the working tree, uncommitted.`)
    console.log('Next: draft the changelog, dry-run the npm publish plan, review `git diff`.')
  })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  Promise.resolve()
    .then(main)
    .catch((err) => {
      console.error(err.message)
      process.exit(2)
    })
}
