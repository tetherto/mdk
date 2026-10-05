import test from 'node:test'
import assert from 'node:assert/strict'

import { resolveCrawlFiles } from '../docs/scripts/link-check.mjs'

const ALL = ['README.md', 'docs/a.md', 'docs/b.md', 'guides/c.md']

test('no args → full sweep of every tracked file', () => {
  const { files, scoped } = resolveCrawlFiles(ALL, [])
  assert.equal(scoped, false)
  assert.deepEqual(files, ALL)
})

test('flag-only args → full sweep, not a README-only crawl (regression guard)', () => {
  // The nightly job invokes `npm run link-check -- --format json`. Those flags
  // must NOT be mistaken for a zero-file scope; doing so silently collapsed the
  // full sweep to the README anchor and let broken links pass unnoticed.
  const { files, scoped } = resolveCrawlFiles(ALL, ['--format', 'json'])
  assert.equal(scoped, false)
  assert.deepEqual(files, ALL)
})

test('explicit tracked files → scoped to those, with README as server-root anchor', () => {
  const { files, scoped } = resolveCrawlFiles(ALL, ['docs/a.md', 'docs/b.md'])
  assert.equal(scoped, true)
  assert.deepEqual(files, ['README.md', 'docs/a.md', 'docs/b.md'])
})

test('scoped list already naming README does not double-add it', () => {
  const { files } = resolveCrawlFiles(ALL, ['README.md', 'docs/a.md'])
  assert.deepEqual(files, ['README.md', 'docs/a.md'])
})

test('flags mixed with a tracked file → scope to the file, ignore the flags', () => {
  const { files, scoped } = resolveCrawlFiles(ALL, ['--format', 'json', 'docs/a.md'])
  assert.equal(scoped, true)
  assert.deepEqual(files, ['README.md', 'docs/a.md'])
})

test('args naming no tracked file → full sweep (safe superset), never an empty crawl', () => {
  const { files, scoped } = resolveCrawlFiles(ALL, ['deleted.md'])
  assert.equal(scoped, false)
  assert.deepEqual(files, ALL)
})
