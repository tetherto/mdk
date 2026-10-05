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
// All three checks must pass for `npm run link-check` to succeed, in both
// modes below. See docs/reference/maintainers/linters.md
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
// It never reaches linkinator either, which is why the report format travels
// as LINK_CHECK_FORMAT instead. check-directory-links.mjs always runs in full
// either way — it isn't a per-file crawl, just a handful of `git ls-files`
// checks against linkinator.config.json's skip list, so there's no "scoped"
// version of it and no cost to running it in full every time.
// check-md-anchors.mjs also always runs in full: it reads files directly
// instead of crawling, so a full pass is cheap and an anchor break is never
// confined to the diff.

import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { listTrackedMarkdown } from './lib/tracked-markdown.mjs'

const REPO_ROOT = process.cwd()

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

function main () {
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

  // Both sub-checks are spawned before linkinator so they always run in full
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

  const format = process.env.LINK_CHECK_FORMAT
    ? ['--format', process.env.LINK_CHECK_FORMAT]
    : []

  const result = spawnSync(
    'npx',
    ['--yes', 'linkinator@7.6.1', '--config', 'linkinator.config.json', ...format, ...files],
    { cwd: REPO_ROOT, stdio: 'inherit' }
  )

  const linkinatorOk = (result.status ?? 1) === 0
  process.exit(directoryLinksOk && anchorsOk && linkinatorOk ? 0 : 1)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
