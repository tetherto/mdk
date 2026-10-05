#!/usr/bin/env node
'use strict'

// Verifies that every directory-shaped entry in linkinator.config.json's
// `skip` list still resolves to a real, git-tracked directory. Those entries
// exist because linkinator's local-HTTP-server crawl can't distinguish "this
// directory exists but has no index file to serve" from "this directory
// doesn't exist at all" — both 404. A `skip` entry is just a regex, applied
// blindly forever, so if the directory it names is later renamed or deleted,
// linkinator keeps "passing" on a now-dead reference with nothing to notice.
// This script closes that gap with a direct check instead.
//
// Existence is checked via `git ls-files`, not raw `fs` calls — same
// rationale as docs/scripts/link-check.mjs's file-listing choice: a local
// checkout can have untracked cruft (a stray `node_modules/` left over from
// a package that used to live in a now-removed directory, for example) that
// makes a directory appear to exist locally when a clean CI checkout would
// never see it. Checking tracked files only keeps local runs honest.
// See docs/reference/maintainers/linters.md for policy and rationale.

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const REPO_ROOT = process.cwd()
const CONFIG_PATH = path.join(REPO_ROOT, 'linkinator.config.json')
const NOTE_MARKER = 'bare directory path'
const WILDCARD_TOKEN = '[^/]+'

// Matches the shape shared by every current directory-false-positive skip
// entry: one or more literal path segments (letters/digits/./-/_), joined by
// "/", with at most one "[^/]+" wildcard segment, ending in an optional
// trailing "/" before the regex end-anchor "$". Deliberately excludes the
// other kinds of entries in `skip` — generic exclusions (`node_modules`,
// `(^|/)dist/`, `(^|/)coverage/`) and URLs (`^https://...`) never match this
// shape, so they're never mistaken for directory candidates.
const DIRECTORY_SHAPE_RE = /^[\w./-]+(?:\/(?:[\w.-]+|\[\^\/\]\+))*\/?\??\$$/

function isDirectoryShaped (entry) {
  if (/^\^?https?:/.test(entry)) return false
  return DIRECTORY_SHAPE_RE.test(entry)
}

function loadDirectoryEntries () {
  const raw = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'))
  const skip = raw.skip || []
  const notes = raw._skip_notes || {}

  const candidates = skip.filter(isDirectoryShaped)
  const missingNotes = candidates.filter((entry) => !(notes[entry] || '').includes(NOTE_MARKER))
  if (missingNotes.length > 0) {
    throw new Error(
      `linkinator.config.json: these skip entries look like directory-false-positive entries ` +
      `but have no _skip_notes entry containing "${NOTE_MARKER}" (a silent skip with no note is ` +
      `a false negative waiting to happen). Add one, or fix the entry's shape if it isn't actually ` +
      `a directory skip: ${missingNotes.join(', ')}`
    )
  }

  return candidates
}

function trackedFilesUnder (relPrefix) {
  // No try/catch: a non-matching prefix exits 0 with empty stdout (that's how
  // "doesn't exist" is represented below), so anything `git` actually throws
  // here — missing binary, not a repo, a bad pathspec — is a real environment
  // failure, not a stale entry. Letting it propagate points at the true cause
  // instead of reporting every entry as stale.
  const out = execFileSync('git', ['ls-files', '--', relPrefix], { cwd: REPO_ROOT, encoding: 'utf8' })
  return out.split('\n').filter(Boolean)
}

function checkLiteral (pattern) {
  return trackedFilesUnder(pattern).length > 0
}

function checkSingleWildcard (entry, pattern) {
  const parts = pattern.split(WILDCARD_TOKEN)
  if (parts.length !== 2) {
    throw new Error(
      `check-directory-links: don't know how to verify skip entry "${entry}" — ` +
      `expected exactly one "${WILDCARD_TOKEN}" segment. Extend checkEntry() in ` +
      `docs/scripts/check-directory-links.mjs to handle its shape.`
    )
  }

  const [before, after] = parts
  // `before` ends with "/" (e.g. "backend/workers/miners/"), `after` starts
  // with "/" or is empty — drop empty segments from the leading/trailing
  // slash before validating each is a plain literal path segment.
  const beforeSegments = before.split('/').filter(Boolean)
  const suffixSegments = after.split('/').filter(Boolean)
  const allLiteral = [...beforeSegments, ...suffixSegments].every((s) => /^[\w.-]+$/.test(s))
  if (!allLiteral) {
    throw new Error(
      `check-directory-links: don't know how to verify skip entry "${entry}" — ` +
      `non-literal characters outside the wildcard segment. Extend checkEntry() in ` +
      `docs/scripts/check-directory-links.mjs to handle its shape.`
    )
  }

  if (beforeSegments.length === 0) {
    // An empty `parentPrefix` below would call `git ls-files -- ''`, which
    // errors on an empty pathspec — a confusing failure for what's really an
    // unsupported entry shape (wildcard as the first segment, e.g.
    // "[^/]+/base/?$"), not a git or environment problem.
    throw new Error(
      `check-directory-links: don't know how to verify skip entry "${entry}" — ` +
      `the wildcard can't be the first segment (no literal parent prefix to check ` +
      `tracked files under). Extend checkEntry() in docs/scripts/check-directory-links.mjs ` +
      `to handle its shape.`
    )
  }

  const parentPrefix = beforeSegments.join('/')
  const tracked = trackedFilesUnder(parentPrefix)

  // For each tracked file under the parent, the wildcard consumes exactly
  // one path segment (the matched child directory name); the remaining
  // segments must then match the literal suffix in order.
  return tracked.some((file) => {
    const rel = file.slice(parentPrefix.length + 1).split('/')
    if (rel.length < 1 + suffixSegments.length) return false
    return suffixSegments.every((seg, i) => rel[1 + i] === seg)
  })
}

function checkEntry (entry) {
  const pattern = entry.replace(/\/\?\$$|\$$/, '')

  if (!pattern.includes(WILDCARD_TOKEN)) {
    return checkLiteral(pattern)
  }

  return checkSingleWildcard(entry, pattern)
}

function main () {
  const entries = loadDirectoryEntries()
  const stale = []

  for (const entry of entries) {
    if (!checkEntry(entry)) stale.push(entry)
  }

  if (stale.length === 0) {
    console.log(`check:directory-links — all ${entries.length} directory-skip entr${entries.length === 1 ? 'y' : 'ies'} still resolve.`)
    return
  }

  console.log('check:directory-links — stale directory-skip entries found (no longer resolve to a real, tracked directory):\n')
  for (const entry of stale) {
    console.log(`  ${entry}`)
  }
  console.log(`\n${stale.length} stale entr${stale.length === 1 ? 'y' : 'ies'} in linkinator.config.json's skip list. ` +
    'Fix the target, or remove the entry (and its _skip_notes pair) if it no longer applies.')
  process.exitCode = 1
}

main()
