#!/usr/bin/env node
'use strict'

// Thin wrapper around linkinator: scopes the crawl to git-tracked Markdown only,
// not a raw filesystem glob. A `**/*.md` glob also picks up gitignored files
// physically sitting in a maintainer's working directory (personal scratch notes,
// local checklists) — files CI never sees, since its checkout starts clean.
// Checking them locally produces false positives (and false SFW-blocked hosts)
// that don't reflect anything in the actual doc corpus.
//
// Also runs check-directory-links.mjs as a second, independent subprocess:
// it verifies linkinator.config.json's directory-shaped skip entries still
// resolve to a real directory, closing a gap linkinator itself can't (it
// can't tell "exists, no index file" apart from "doesn't exist", so a
// skip-listed directory that's later renamed or deleted would otherwise keep
// silently "passing" forever). check-md-anchors.mjs is a third subprocess: it
// resolves every cross-file and in-page `*.md#anchor` link against the target
// file's own headings, closing linkinator's order-dependent fragment gap (a
// fragment discovered after its target was already fetched is never validated).
// The script itself also fails when any tracked .md file names this repo,
// since this Markdown is promoted to the public repo (code blocks included:
// sample paths live there). All four checks must pass for `npm run link-check`
// to succeed, in both modes below. See docs/reference/maintainers/linters.md
// for policy and rationale.
//
// Optionally accepts an explicit list of .md files as CLI args
// (`npm run link-check -- foo.md bar.md`) to scope the linkinator crawl to
// just those files — this is what the PR workflow job passes in (the files
// changed in the diff), so a PR check never crawls the whole repo. With no
// args (the nightly job, and the default local run), every tracked .md file
// is crawled. Only tracked .md paths narrow the crawl; any other argument —
// e.g. a linkinator flag such as `--format json` — is ignored here (with a
// warning on stderr) and leaves the full sweep intact (see resolveCrawlFiles).
// It never reaches linkinator either; the wrapper always runs linkinator in
// JSON mode for its own use, and LINK_CHECK_FORMAT=json (the only value it
// accepts) is the switch for the stdout report below, not a format passed
// through. check-directory-links.mjs always runs in full
// either way — it isn't a per-file crawl, just a handful of `git ls-files`
// checks against linkinator.config.json's skip list, so there's no "scoped"
// version of it and no cost to running it in full every time.
// check-md-anchors.mjs also always runs in full: it reads files directly
// instead of crawling, so a full pass is cheap and an anchor break is never
// confined to the diff. The repo-name scan runs in full for the same reason.
//
// linkinator itself is run with `--format json --verbosity info` so its full
// report (every link, OK or not) comes back on a pipe instead of the terminal.
// From that report the script prints the broken rows and one closing line to
// stderr (`link-check: N links checked (E external, S skipped), B broken`),
// and fails when B > 0, when N is 0, or when any crawl root came back SKIPPED.
// The last two are the hollow-sweep guard: a skip pattern that matches
// linkinator's own local server (it serves the repo at http://localhost:<random
// port>/) skips every root, reports nothing, and exits 0. The same pattern is
// also refused up front, before the crawl, by matching every skip entry against
// a stand-in for the server root. With LINK_CHECK_FORMAT=json, the broken rows are also written
// to stdout as `{ passed, links }`, the shape the nightly workflow parses.
//
// A full sweep runs as several linkinator processes (batchFiles), merged into
// one report before counting (mergeReports). Socket Firewall proxies every
// fetch of linkinator's own local server and gives out once one process has
// made more than a couple of hundred fetches, so each batch is sized by an
// estimate of the fetches it will make: its roots plus the unique link
// targets they carry (linkTargets), kept under FETCH_BUDGET. Batching keeps
// the sweep within that without taking any request off the firewall. A
// scoped PR run is usually a single batch.

import { spawnSync } from 'node:child_process'
import { appendFileSync, readFileSync } from 'node:fs'
import { posix } from 'node:path'
import { pathToFileURL } from 'node:url'
import { listTrackedMarkdown } from './lib/tracked-markdown.mjs'

const REPO_ROOT = process.cwd()
const REPO_NAME = /\bmdk-prv\b/i
const LINKINATOR_CONFIG = 'linkinator.config.json'

// Stand-ins for linkinator's own file server, which it starts on localhost at a
// random port and roots every crawl at. Port 1 is never that port, so a skip
// entry matching either probe is one that matches the host alone, and would
// skip every crawl root. That is all this probe catches: a port-shaped entry
// such as `localhost:\d{5}` gets past it and can still swallow the roots. The
// post-crawl check in summarizeReport (a crawl root reported SKIPPED fails the
// run) is the backstop for everything the probe cannot see.
export const SERVER_ROOT_PROBES = [
  'http://localhost:1/README.md',
  'http://127.0.0.1:1/README.md'
]

// The skip entries that would swallow the crawl roots. Pure and exported for
// the unit test, which runs it over the real config.
export function skipsMatchingServerRoot (skip) {
  return skip.filter((pattern) => {
    const re = new RegExp(pattern)
    return SERVER_ROOT_PROBES.some((url) => re.test(url))
  })
}

// Reduce linkinator's JSON report rows ({ url, state, status, parent }) to the
// counts the closing line prints and the verdict the exit code needs. A crawl
// root is a row with no parent; one that came back SKIPPED means a skip pattern
// matched the server itself, and an empty report means nothing was crawled at
// all. Either is a hollow sweep, whatever linkinator's own exit status says.
export function summarizeReport (links) {
  const broken = links.filter((l) => l.state === 'BROKEN')
  const skipped = links.filter((l) => l.state === 'SKIPPED')
  const skippedRoots = skipped.filter((l) => !l.parent).map((l) => l.url)
  const external = links.filter((l) => /^https?:\/\//.test(l.url)).length
  return {
    checked: links.length,
    external,
    skipped: skipped.length,
    broken,
    skippedRoots,
    hollow: links.length === 0 || skippedRoots.length > 0
  }
}

export function formatSummary (s) {
  return `link-check: ${s.checked} links checked (${s.external} external, ${s.skipped} skipped), ${s.broken.length} broken`
}

// Resolve which tracked .md files linkinator should crawl, given the full
// tracked set and the raw CLI args. Pure and exported so the flag-vs-file
// split is unit-tested (test/link-check-scope.test.mjs) without spawning git
// or linkinator.
//
// Only args that name a tracked .md file scope the crawl. Every other arg —
// a linkinator flag like `--format json` and its value — is ignored here and
// does NOT narrow the sweep. Keying scope off real tracked-file matches
// rather than "any arg present" is the fix for the regression where the
// nightly's `-- --format json` was read as an empty scope and collapsed the
// full sweep to the README anchor alone.
export function resolveCrawlFiles (allFiles, args) {
  const allFilesSet = new Set(allFiles)
  const requestedFiles = args.filter((a) => allFilesSet.has(a))

  if (requestedFiles.length === 0) {
    return { files: allFiles, scoped: false }
  }

  let files = requestedFiles

  // README.md is always included as a server-root anchor: linkinator roots
  // its local server at the common ancestor of its inputs, so a scoped list
  // of only deep files (e.g. docs/reference/.../x.md) would root the server
  // inside that subtree and report every `../`-escaping relative link as a
  // false 404. Including a repo-root file pins the server root to the repo
  // root; it only adds README's own links to the scan, not a full-tree crawl.
  if (!files.includes('README.md') && allFilesSet.has('README.md')) {
    files = ['README.md', ...files]
  }

  return { files, scoped: true }
}

// Estimated fetches per linkinator process. Under Socket Firewall a process
// that makes more than a couple of hundred fetches of linkinator's own server
// is cut short; this keeps every batch well inside that. Raise it only after
// a full `npm run link-check` under `sfw` still ends with the closing
// `link-check:` line.
export const FETCH_BUDGET = 120

const INLINE_LINK = /\]\(\s*<?([^)\s>]+)>?/g
const REFERENCE_DEFINITION = /^\s*\[[^\]]+\]:\s*<?(\S+?)>?\s*(?:["'(]|$)/gm

// The unique URLs linkinator would fetch for one page's links: every http(s)
// target as written (minus its fragment) and every relative target resolved
// against the page's directory. An estimate, not a parse: it counts the
// links, not what linkinator will skip, so it errs high.
export function linkTargets (file, text) {
  const targets = new Set()
  for (const re of [INLINE_LINK, REFERENCE_DEFINITION]) {
    for (const match of text.matchAll(re)) {
      const raw = match[1]
      if (/^https?:/i.test(raw)) {
        targets.add(raw.split('#')[0])
        continue
      }
      if (/^(mailto:|#)/i.test(raw)) continue
      const rel = raw.split('#')[0].split('?')[0]
      if (rel) targets.add(posix.normalize(posix.join(posix.dirname(file), rel)))
    }
  }
  return targets
}

// Pack the crawl list into batches whose estimated fetches (roots plus the
// unique targets they carry) stay within `budget`, each carrying README.md as
// the server-root anchor (see resolveCrawlFiles). Files keep their order. A
// page that alone exceeds the budget still gets a batch of its own.
export function batchFiles (files, { budget = FETCH_BUDGET, linksOf = (f) => linkTargets(f, readFileSync(f, 'utf8')) } = {}) {
  const anchor = files.includes('README.md') ? ['README.md'] : []
  const rest = files.filter((f) => f !== 'README.md')
  const batches = []
  let batch = null
  let seen = null
  const open = () => {
    batch = [...anchor]
    seen = new Set(anchor)
    for (const a of anchor) for (const t of linksOf(a)) seen.add(t)
    batches.push(batch)
  }
  for (const file of rest) {
    const targets = linksOf(file)
    if (batch) {
      const added = [file, ...targets].filter((t) => !seen.has(t)).length
      if (seen.size + added > budget) batch = null
    }
    if (!batch) open()
    batch.push(file)
    seen.add(file)
    for (const t of targets) seen.add(t)
  }
  return batches.length > 0 ? batches : [files]
}

// Merge per-batch linkinator reports into one. README.md's own rows and any
// URL shared across batches appear once per (url, parent) pair, the shape a
// single run produces, so the closing count does not inflate with batching.
export function mergeReports (reports) {
  const seen = new Set()
  const links = []
  for (const report of reports) {
    for (const link of report.links ?? []) {
      const key = `${link.parent ?? ''}\u0000${link.url}`
      if (seen.has(key)) continue
      seen.add(key)
      links.push(link)
    }
  }
  return { passed: reports.every((r) => r.passed === true), links }
}

// Whether to write the `{ passed, links }` report to stdout. The wrapper
// emits one shape only, so the variable is a switch, kept under its original
// name because the nightly workflow sets it on every branch it checks out.
// Any value other than `json` is a mistake, not a request for another format.
export function wantsStdoutReport (env) {
  const value = env.LINK_CHECK_FORMAT
  if (!value) return false
  if (value === 'json') return true
  throw new Error(`LINK_CHECK_FORMAT=${value} is not supported; the only stdout report is json (set LINK_CHECK_FORMAT=json or leave it unset)`)
}

// Every `file:line` of a tracked .md file that names this repo.
function findRepoName (files) {
  const hits = []
  for (const file of files) {
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      if (REPO_NAME.test(line)) hits.push(`${file}:${i + 1} -> mdk-prv`)
    })
  }
  return hits
}

function main () {
  let stdoutReport
  try {
    stdoutReport = wantsStdoutReport(process.env)
  } catch (err) {
    console.error(`link-check: ${err.message}`)
    process.exit(1)
  }

  const config = JSON.parse(readFileSync(LINKINATOR_CONFIG, 'utf8'))
  const rootSwallowing = skipsMatchingServerRoot(config.skip ?? [])
  if (rootSwallowing.length > 0) {
    console.error(`link-check: ${LINKINATOR_CONFIG} has skip entries that match linkinator's own server root, so nothing would be crawled:`)
    for (const pattern of rootSwallowing) console.error(`  ${pattern}`)
    console.error('Scope localhost skips to the example ports; see docs/reference/maintainers/linters.md.')
    process.exit(1)
  }

  const allFiles = listTrackedMarkdown(REPO_ROOT)

  if (allFiles.length === 0) {
    console.error('No tracked Markdown files found.')
    process.exit(1)
  }

  const args = process.argv.slice(2)
  const { files } = resolveCrawlFiles(allFiles, args)

  const allFilesSet = new Set(allFiles)
  const ignored = args.filter((a) => !allFilesSet.has(a))
  if (ignored.length > 0) {
    console.error(`link-check: ignoring arguments that are not tracked Markdown files: ${ignored.join(' ')}`)
  }

  // The sub-checks are spawned before linkinator so they always run in full
  // regardless of scope, per the header comment. Their stdout goes to fd 2 so
  // it can't corrupt linkinator's report when LINK_CHECK_FORMAT=json: the
  // nightly workflow parses stdout as JSON and reads the sub-checks' findings
  // from stderr.
  const directoryLinksResult = spawnSync(
    'node',
    ['docs/scripts/check-directory-links.mjs'],
    { cwd: REPO_ROOT, stdio: ['inherit', 2, 'inherit'] }
  )
  const directoryLinksOk = (directoryLinksResult.status ?? 1) === 0

  const anchorsResult = spawnSync(
    'node',
    ['docs/scripts/check-md-anchors.mjs'],
    { cwd: REPO_ROOT, stdio: ['inherit', 2, 'inherit'] }
  )
  const anchorsOk = (anchorsResult.status ?? 1) === 0

  const repoNameHits = findRepoName(allFiles)
  if (repoNameHits.length > 0) {
    console.error(`Repo name in Markdown (${repoNameHits.length}):`)
    for (const hit of repoNameHits) console.error(`  ${hit}`)
  }
  const repoNameOk = repoNameHits.length === 0

  // Always JSON at info verbosity, whatever the config says: the config's
  // `verbosity` keeps a direct `npx linkinator` run quiet, but the wrapper
  // needs every row to count them. In JSON mode linkinator prints nothing
  // while it crawls, on either stream, so the only progress is the lines
  // below: one before the crawl and one per batch, on stderr. A run cut
  // short therefore still shows how far it got.
  const batches = batchFiles(files)
  console.error(`link-check: crawling ${files.length} files in ${batches.length} ${batches.length === 1 ? 'batch' : 'batches'}`)
  const reports = []
  let linkinatorStatus = 0
  for (const [i, batch] of batches.entries()) {
    if (batches.length > 1) console.error(`link-check: batch ${i + 1} of ${batches.length}, ${batch.length} files`)
    const result = spawnSync(
      'npx',
      ['--yes', 'linkinator@7.6.1', '--config', LINKINATOR_CONFIG, '--format', 'json', '--verbosity', 'info', ...batch],
      { cwd: REPO_ROOT, stdio: ['inherit', 'pipe', 'inherit'], encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
    )
    const where = batches.length > 1 ? ` (batch ${i + 1} of ${batches.length})` : ''
    try {
      reports.push(JSON.parse(result.stdout))
    } catch {
      console.error(`link-check: linkinator exited ${result.status ?? 'without a status'} and produced no parseable report${where}`)
      if (result.stdout) console.error(result.stdout.slice(0, 2000))
      process.exit(1)
    }
    if ((result.status ?? 1) !== 0) linkinatorStatus = result.status ?? 1
  }
  const report = mergeReports(reports)

  const summary = summarizeReport(report.links)
  const notes = []
  for (const l of summary.broken) console.error(`[${l.status}] ${l.url} (in ${l.parent ?? 'crawl root'})`)
  // The ` -> ` shape is what the nightly workflow greps out of stderr into the
  // tracking issue, alongside the BROKEN rows it reads from the JSON report.
  for (const url of summary.skippedRoots) notes.push(`${url} -> crawl root skipped by a skip pattern; nothing under it was checked`)
  if (summary.checked === 0) notes.push('link-check -> 0 links checked; the crawl never ran')
  for (const note of notes) console.error(note)

  const line = formatSummary(summary)
  console.error(line)
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, [line, ...notes].map((s) => `- ${s}`).join('\n') + '\n')
  }

  const linkinatorOk = linkinatorStatus === 0 && summary.broken.length === 0 && !summary.hollow
  if (stdoutReport) {
    const links = report.links.filter((l) => l.state === 'BROKEN' || (l.state === 'SKIPPED' && !l.parent))
    process.stdout.write(JSON.stringify({ passed: linkinatorOk, links }) + '\n')
  }

  process.exit(directoryLinksOk && anchorsOk && repoNameOk && linkinatorOk ? 0 : 1)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
