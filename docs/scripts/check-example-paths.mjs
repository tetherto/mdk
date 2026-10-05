#!/usr/bin/env node
'use strict'

// Verifies every `examples/...` path named in tracked Markdown (prose or
// fenced code, not just Markdown links) resolves to a real file or directory.
// See docs/reference/maintainers/linters.md for policy and rationale.

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { globToRegExp, requireSkipNotes, isSkippedFile } from './lib/skip-config.mjs'
import { listTrackedMarkdown } from './lib/tracked-markdown.mjs'

const REPO_ROOT = process.cwd()
const CONFIG_PATH = path.join(REPO_ROOT, 'example-paths.config.json')

const CANDIDATE_RE = /(?<![\w/.-])examples\/[A-Za-z0-9_][A-Za-z0-9_./-]*/g
const TRAILING_PUNCT_RE = /[.,)`:;*]+$/
const PLACEHOLDER_NEXT_CHARS = new Set(['<', '>', '*', '{', '}', '…'])

function loadConfig () {
  const raw = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'))
  const skipFiles = raw.skipFiles || []
  const skipPaths = raw.skipPaths || []
  const notes = raw._skip_notes || {}

  requireSkipNotes('example-paths.config.json', 'skipFiles/skipPaths', [...skipFiles, ...skipPaths], notes)

  return {
    skipFiles: skipFiles.map(globToRegExp),
    skipPaths
  }
}

function isSkippedPath (candidate, skipPaths) {
  return skipPaths.some((p) => candidate === p || candidate.startsWith(p + '/'))
}

function extractCandidates (line) {
  const candidates = []
  for (const match of line.matchAll(CANDIDATE_RE)) {
    const raw = match[0]
    const end = match.index + raw.length
    const nextChar = line[end]
    if (nextChar !== undefined && PLACEHOLDER_NEXT_CHARS.has(nextChar)) continue
    const trimmed = raw.replace(TRAILING_PUNCT_RE, '')
    if (!trimmed) continue
    candidates.push({ candidate: trimmed, column: match.index + 1 })
  }
  return candidates
}

function resolves (candidate, relFile) {
  const relativeToFile = path.join(path.dirname(relFile), candidate)
  if (existsSync(path.join(REPO_ROOT, relativeToFile))) return true
  if (existsSync(path.join(REPO_ROOT, candidate))) return true
  return false
}

function main () {
  const config = loadConfig()
  const files = listTrackedMarkdown()
  const findingsByFile = new Map()

  for (const relFile of files) {
    if (isSkippedFile(relFile, config.skipFiles)) continue

    const content = readFileSync(path.join(REPO_ROOT, relFile), 'utf8')
    const lines = content.split('\n')

    for (let i = 0; i < lines.length; i++) {
      for (const { candidate } of extractCandidates(lines[i])) {
        if (isSkippedPath(candidate, config.skipPaths)) continue
        if (resolves(candidate, relFile)) continue

        if (!findingsByFile.has(relFile)) findingsByFile.set(relFile, [])
        findingsByFile.get(relFile).push({ line: i + 1, candidate })
      }
    }
  }

  if (findingsByFile.size === 0) {
    console.log('check:example-paths — no missing example paths found.')
    return
  }

  console.log('check:example-paths — missing example paths found:\n')
  for (const [relFile, findings] of findingsByFile) {
    console.log(relFile)
    for (const { line, candidate } of findings) {
      console.log(`  ${line}: ${candidate}`)
    }
    console.log('')
  }

  const total = [...findingsByFile.values()].reduce((sum, f) => sum + f.length, 0)
  console.log(`${total} missing example path(s) across ${findingsByFile.size} file(s).`)
  process.exitCode = 1
}

main()
