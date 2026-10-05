#!/usr/bin/env node
'use strict'

// Verifies every ERR_* code or option/flag/param/key name cited in a canonical
// error-code or option/config table (see apply-tables.md) still exists
// somewhere in its own package's tracked source. Existence-only — does not
// verify a table's claimed condition/default against actual guard/fallback
// logic. See docs/reference/maintainers/linters.md for policy and rationale.

import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { globToRegExp, requireSkipNotes, isSkippedFile } from './lib/skip-config.mjs'
import { listTrackedMarkdown } from './lib/tracked-markdown.mjs'

const REPO_ROOT = process.cwd()
const CONFIG_PATH = path.join(REPO_ROOT, 'table-refs.config.json')

const SEPARATOR_RE = /^\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)+\|?\s*$/
const ERR_CODE_RE = /ERR_[A-Z0-9_]+/g
const IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_-]*$/

// A plain substring test would pass a truncated/typo'd identifier that's a
// prefix or infix of a real, still-present longer one (e.g. a table row
// mistakenly citing `ERR_FOO` when only `ERR_FOO_BAR` exists in source) —
// bound the match so neither side extends into another identifier char.
// A long flag's `--` is stripped during extraction (see extractIdentifiers),
// so its real source form is always preceded by the flag's own second `-`;
// accept that specific prefix too rather than only a fully bare token.
function existsAsToken (identifier, source) {
  const bare = new RegExp(`(?<![A-Za-z0-9_-])${identifier}(?![A-Za-z0-9_-])`)
  const asLongFlag = new RegExp(`(?<![A-Za-z0-9_-])--${identifier}(?![A-Za-z0-9_-])`)
  return bare.test(source) || asLongFlag.test(source)
}

function loadConfig () {
  const raw = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'))
  const skipFiles = raw.skipFiles || []
  const skipIdentifiers = raw.skipIdentifiers || []
  const notes = raw._skip_notes || {}

  const identifierKeys = skipIdentifiers.map((entry) => `${entry.file}::${entry.identifier}`)
  requireSkipNotes('table-refs.config.json', 'skipFiles/skipIdentifiers', [...skipFiles, ...identifierKeys], notes)

  return {
    skipFiles: skipFiles.map(globToRegExp),
    skipIdentifiers
  }
}

function isSkippedIdentifier (relFile, identifier, skipIdentifiers) {
  return skipIdentifiers.some((s) => s.file === relFile && s.identifier === identifier)
}

function splitRow (line) {
  let trimmed = line.trim()
  if (trimmed.startsWith('|')) trimmed = trimmed.slice(1)
  if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1)
  return trimmed.split('|').map((cell) => cell.trim())
}

// Scans a file's lines for canonical error/option tables (header row whose
// second cell is 'Fires when' or 'Status', immediately followed by a GFM
// separator row), returning each as { kind, rows: [{ cells, line }] }.
function findTables (lines) {
  const tables = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i].trim()
    if (!line.startsWith('|')) {
      i++
      continue
    }
    const next = lines[i + 1]
    if (next === undefined || !SEPARATOR_RE.test(next.trim())) {
      i++
      continue
    }
    const header = splitRow(line)
    let kind = null
    if (header[1] === 'Fires when') kind = 'error'
    else if (header[1] === 'Status') kind = 'option'

    if (kind === null) {
      i += 2
      continue
    }

    const rows = []
    let j = i + 2
    while (j < lines.length && lines[j].trim().startsWith('|')) {
      rows.push({ cells: splitRow(lines[j]), line: j + 1 })
      j++
    }
    tables.push({ kind, rows })
    i = j
  }
  return tables
}

function extractIdentifiers (kind, firstCell) {
  if (kind === 'error') {
    const matches = firstCell.match(ERR_CODE_RE)
    return matches || []
  }

  const identifiers = []
  for (const rawToken of firstCell.replace(/`/g, '').split(',')) {
    const token = rawToken.trim()
    if (!token) continue

    let candidate = null
    if (token.startsWith('--')) {
      candidate = token.slice(2).split(/\s/)[0]
    } else if (token.startsWith('-')) {
      continue // single-letter short flag: too little signal
    } else if (token.includes('.')) {
      const segments = token.split('.')
      candidate = segments[segments.length - 1]
    } else {
      candidate = token
    }

    if (candidate && IDENTIFIER_RE.test(candidate)) {
      identifiers.push(candidate)
    }
  }
  return identifiers
}

function findPackageDir (relFile) {
  let dir = path.dirname(relFile)
  while (true) {
    const candidate = dir === '.' ? 'package.json' : path.join(dir, 'package.json')
    try {
      readFileSync(path.join(REPO_ROOT, candidate), 'utf8')
      return dir === '.' ? '.' : dir
    } catch {
      if (dir === '.' || dir === path.dirname(dir)) return '.'
      dir = path.dirname(dir)
    }
  }
}

const packageSourceCache = new Map()

function packageSource (packageDir) {
  if (packageSourceCache.has(packageDir)) return packageSourceCache.get(packageDir)

  const scope = packageDir === '.' ? [] : ['--', packageDir]
  const out = execFileSync('git', ['ls-files', ...scope], { cwd: REPO_ROOT, encoding: 'utf8' })
  const files = out.split('\n').filter(Boolean).filter((f) => {
    if (f.endsWith('.md')) return false
    if (f.endsWith('package-lock.json')) return false
    if (f.includes('/node_modules/') || f.startsWith('node_modules/')) return false
    if (f.includes('/dist/') || f.startsWith('dist/')) return false
    return true
  })

  let combined = ''
  for (const f of files) {
    try {
      combined += readFileSync(path.join(REPO_ROOT, f), 'utf8')
      combined += '\n'
    } catch {
      // Unreadable (binary, race with a deletion) — skip, not a match source.
    }
  }
  packageSourceCache.set(packageDir, combined)
  return combined
}

function main () {
  const config = loadConfig()
  const files = listTrackedMarkdown()
  const findingsByFile = new Map()

  for (const relFile of files) {
    if (isSkippedFile(relFile, config.skipFiles)) continue

    const content = readFileSync(path.join(REPO_ROOT, relFile), 'utf8')
    const lines = content.split('\n')
    const tables = findTables(lines)
    if (tables.length === 0) continue

    const packageDir = findPackageDir(relFile)
    const source = packageSource(packageDir)

    for (const table of tables) {
      for (const row of table.rows) {
        const identifiers = extractIdentifiers(table.kind, row.cells[0] || '')
        for (const identifier of identifiers) {
          if (isSkippedIdentifier(relFile, identifier, config.skipIdentifiers)) continue
          if (existsAsToken(identifier, source)) continue

          if (!findingsByFile.has(relFile)) findingsByFile.set(relFile, [])
          findingsByFile.get(relFile).push({ line: row.line, identifier, packageDir })
        }
      }
    }
  }

  if (findingsByFile.size === 0) {
    console.log('check:table-refs — no stale table references found.')
    return
  }

  console.log('check:table-refs — stale table references found (existence-only check — the cited identifier no')
  console.log('longer appears anywhere in its package source; this does not verify the table\'s claimed condition):\n')
  for (const [relFile, findings] of findingsByFile) {
    console.log(relFile)
    for (const { line, identifier, packageDir } of findings) {
      console.log(`  ${line}: ${identifier} (searched package: ${packageDir})`)
    }
    console.log('')
  }

  const total = [...findingsByFile.values()].reduce((sum, f) => sum + f.length, 0)
  console.log(`${total} stale table reference(s) across ${findingsByFile.size} file(s).`)
  process.exitCode = 1
}

main()
