#!/usr/bin/env node
'use strict'

// `npm run link-check`: every link in the tracked tree, in two halves.
//
//   1. In-repo links are resolved offline against the git tree by
//      lib/repo-links.mjs: relative links (file, folder or heading) in Markdown and
//      in source comments, routing comments, and public URLs into this tree from any
//      tracked file. Always the whole tree: it reads files, so a full pass is cheap
//      and a break is never confined to a diff.
//   2. Every other http(s) URL is fetched by linkinator. The wrapper writes them
//      to one generated page and points linkinator at it, so linkinator's local
//      server serves that page and nothing else: it never crawls the repo.
//
// It also fails when a tracked .md file names this repo, since this Markdown is
// promoted to the public repo (code blocks included: sample paths live there).
//
// Arguments:
//   <files...>  tracked files: fetch only the external URLs they carry (the PR
//               gate passes the diff). With none, every external URL is fetched.
//   --offline   skip half 2. No network, so it runs anywhere, at any time.
// Any other argument is ignored with a warning and never narrows the sweep.
// LINK_CHECK_FORMAT=json also writes `{ passed, links }` (broken rows only) to
// stdout, the shape the nightly workflow parses; any other value fails the run.
//
// Policy: docs/reference/maintainers/linters.md#nightly-and-pr-diff-link-verification--linkinator

import { spawnSync } from 'node:child_process'
import { appendFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { checkRepoLinks, listInputs } from './lib/repo-links.mjs'

// The repo root, wherever the command is run from: every path below is repo-relative.
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const REPO_NAME = /\bmdk-prv\b/i
const LINKINATOR = 'linkinator@7.6.1'
const LINKINATOR_CONFIG = 'linkinator.config.json'

// Which files' external URLs to fetch, given every file that can carry one and the
// raw CLI args. Only an arg naming such a file narrows the scope; anything else (a
// flag, a deleted file) leaves the full sweep intact, so a stray argument can
// never collapse the check to nothing.
export function resolveScope (allFiles, args) {
  const known = new Set(allFiles)
  const files = args.filter((a) => known.has(a))
  return files.length > 0 ? { files, scoped: true } : { files: allFiles, scoped: false }
}

const href = (url) => {
  try { return new URL(url).href } catch { return url }
}

// Where each external URL sits, keyed as linkinator reports it (normalized, with
// and without its fragment), so a broken row can name its source lines.
export function sourcesOf (external) {
  const sources = new Map()
  for (const { url, file, line } of external) {
    for (const key of new Set([href(url), href(url).split('#')[0]])) {
      sources.set(key, [...(sources.get(key) ?? []), `${file}:${line}`])
    }
  }
  return sources
}

// The one page linkinator crawls: a link per unique external URL, nothing local.
export function externalPage (external) {
  const escape = (text) => text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
  const urls = [...new Set(external.map((e) => e.url))]
  return `<!doctype html>\n<title>External links</title>\n${urls.map((u) => `<a href="${escape(u)}">${escape(u)}</a>`).join('\n')}\n`
}

// Reduce linkinator's JSON rows ({ url, state, status, parent }) to { checked,
// skipped, broken, warned, hollow }. The crawl root is the generated page, the
// one row with no parent. Hollow means the run could not have found anything,
// whatever linkinator's exit status says: no root row, a root that is not OK (a
// skip entry matched linkinator's own server), or no row for any link on the
// page. On the full sweep, every link skipped is hollow too: a skip pattern
// swallowed the tree. A scoped run can legitimately carry only skipped URLs.
export function summarizeReport (links, { scoped = false } = {}) {
  const roots = links.filter((l) => !l.parent)
  const fetched = links.filter((l) => l.parent)
  return {
    checked: fetched.length,
    skipped: fetched.filter((l) => l.state === 'SKIPPED').length,
    broken: fetched.filter((l) => l.state === 'BROKEN'),
    // A status the config's `statusCodes` downgrades to `warn` comes back as an OK
    // row that still carries the status; linkinator prints nothing about it.
    warned: fetched.filter((l) => l.state === 'OK' && typeof l.status === 'number' && l.status >= 400),
    hollow: roots.length === 0 || roots.some((l) => l.state !== 'OK') || fetched.length === 0 ||
      (!scoped && fetched.every((l) => l.state === 'SKIPPED'))
  }
}

// The closing line. `external` is a summarizeReport result, or null when the
// network half did not run (--offline, or a scoped run with no external URL).
export function formatSummary ({ files, failures }, external) {
  const repo = `link-check: ${files} files resolved offline (${failures} broken)`
  if (!external) return `${repo}, no external links fetched`
  const warned = external.warned.length ? `, ${external.warned.length} warned` : ''
  return `${repo}, ${external.checked} external links fetched (${external.skipped} skipped, ${external.broken.length} broken${warned})`
}

// Whether to write the `{ passed, links }` report to stdout. The wrapper emits
// one shape only, so the variable is a switch; any value other than `json` is a
// mistake, not a request for another format.
export function wantsStdoutReport (env) {
  const value = env.LINK_CHECK_FORMAT
  if (!value) return false
  if (value === 'json') return true
  throw new Error(`LINK_CHECK_FORMAT=${value} is not supported; the only stdout report is json (set LINK_CHECK_FORMAT=json or leave it unset)`)
}

// Fetch `external` through linkinator. Returns its rows, or null when it gave no report.
function fetchExternal (external) {
  const dir = mkdtempSync(path.join(tmpdir(), 'link-check-'))
  try {
    const page = path.join(dir, 'external-links.html')
    writeFileSync(page, externalPage(external))
    // Always JSON at info verbosity: the wrapper needs every row to count them.
    const result = spawnSync(
      'npx',
      ['--yes', LINKINATOR, '--config', path.resolve(LINKINATOR_CONFIG), '--format', 'json', '--verbosity', 'info', page],
      { cwd: REPO_ROOT, stdio: ['inherit', 'pipe', 'inherit'], encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
    )
    try {
      return JSON.parse(result.stdout).links ?? []
    } catch {
      console.error(`link-check: linkinator exited ${result.status ?? 'without a status'} and produced no parseable report${result.error ? ` (${result.error.message})` : ''}`)
      if (result.stdout) console.error(result.stdout.slice(0, 2000))
      return null
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

function main () {
  process.chdir(REPO_ROOT)
  let stdoutReport
  try {
    stdoutReport = wantsStdoutReport(process.env)
  } catch (err) {
    console.error(`link-check: ${err.message}`)
    process.exit(1)
  }

  const inputs = listInputs(REPO_ROOT)
  if (inputs.markdown.length === 0) {
    console.error('No tracked Markdown files found.')
    process.exit(1)
  }
  const { version } = JSON.parse(readFileSync('package.json', 'utf8'))
  // Each file is read once: the resolver asks for a page as a link source and
  // again as an anchor target, and the repo-name scan below reads it too.
  const texts = new Map()
  const read = (file) => {
    if (!texts.has(file)) texts.set(file, readFileSync(file, 'utf8'))
    return texts.get(file)
  }
  const repo = checkRepoLinks({ ...inputs, version, read })

  // Everything except the JSON report goes to stderr: the nightly workflow parses
  // stdout as JSON and greps the ` -> ` rows out of stderr into its tracking issue.
  if (repo.warnings.length > 0) {
    console.error(`Routing comments that disagree with their link definition (${repo.warnings.length}):`)
    for (const warning of repo.warnings) console.error(`  ${warning}`)
  }
  if (repo.failures.length > 0) {
    console.error(`Broken in-repo links (${repo.failures.length}):`)
    for (const failure of repo.failures) console.error(`  ${failure}`)
  }

  const repoNameHits = inputs.markdown.flatMap((file) => read(file).split('\n')
    .flatMap((line, i) => REPO_NAME.test(line) ? [`${file}:${i + 1} -> mdk-prv`] : []))
  if (repoNameHits.length > 0) {
    console.error(`Repo name in Markdown (${repoNameHits.length}):`)
    for (const hit of repoNameHits) console.error(`  ${hit}`)
  }

  const args = process.argv.slice(2)
  const offline = args.includes('--offline')
  const { files, scoped } = resolveScope([...inputs.markdown, ...inputs.source], args)
  const ignored = args.filter((a) => a !== '--offline' && !files.includes(a))
  if (ignored.length > 0) {
    console.error(`link-check: ignoring arguments that are not tracked files carrying links: ${ignored.join(' ')}`)
  }

  const inScope = new Set(files)
  const external = repo.external.filter((e) => inScope.has(e.file))
  const notes = []
  let summary = null
  let brokenRows = []
  if (!offline && external.length > 0) {
    const sources = sourcesOf(external)
    const where = (url) => (sources.get(href(url)) ?? sources.get(href(url).split('#')[0]) ?? ['unknown source']).join(', ')
    const rows = fetchExternal(external)
    if (rows === null) process.exit(1)
    summary = summarizeReport(rows, { scoped })
    // Warned rows carry no ` -> `, so the nightly's grep of stderr does not pick them up.
    for (const l of summary.warned) console.error(`warned [${l.status}] ${l.url} (in ${where(l.url)}); see statusCodes in ${LINKINATOR_CONFIG}`)
    for (const l of summary.broken) console.error(`[${l.status}] ${l.url} (in ${where(l.url)})`)
    brokenRows = summary.broken.map((l) => ({ ...l, parent: where(l.url) }))
    if (summary.hollow) notes.push('link-check -> linkinator fetched nothing: no report rows, or a skip pattern matched its own server or, on a full sweep, every URL')
  } else if (!offline && !scoped) {
    notes.push('link-check -> no external URL found in the tree; the extraction is broken')
  }
  for (const note of notes) console.error(note)

  const line = formatSummary({ files: repo.files, failures: repo.failures.length }, summary)
  console.error(line)
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, [line, ...notes].map((s) => `- ${s}`).join('\n') + '\n')
  }

  const passed = repo.failures.length === 0 && repoNameHits.length === 0 && notes.length === 0 && brokenRows.length === 0
  if (stdoutReport) process.stdout.write(JSON.stringify({ passed, links: brokenRows }) + '\n')

  process.exit(passed ? 0 : 1)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
