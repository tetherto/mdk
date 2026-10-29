import test from 'node:test'
import assert from 'node:assert/strict'

import { readFileSync } from 'node:fs'
import {
  resolveCrawlFiles,
  skipsMatchingServerRoot,
  summarizeReport,
  formatSummary,
  batchFiles,
  linkTargets,
  mergeReports,
  wantsStdoutReport
} from '../docs/scripts/link-check.mjs'

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

// --- hollow-sweep guard -----------------------------------------------------
//
// A skip pattern that matches linkinator's own local server skips every crawl
// root; the report is empty and linkinator exits 0. Three things stop that:
// the real config is checked against a server-root stand-in, a bare localhost
// pattern is refused, and an empty or root-skipped report fails the run.

const BARE_LOCALHOST = '^https?://(localhost|127\\.0\\.0\\.1)'
const PORT_SCOPED_LOCALHOST = '^https?://(localhost|127\\.0\\.0\\.1)(:(3000|3030))?(/|$)'

test('linkinator.config.json: no skip entry matches the server root (regression guard)', () => {
  const config = JSON.parse(readFileSync('linkinator.config.json', 'utf8'))
  assert.deepEqual(skipsMatchingServerRoot(config.skip), [])
})

test('a bare localhost skip is refused; a port-scoped one is not', () => {
  assert.deepEqual(skipsMatchingServerRoot([BARE_LOCALHOST]), [BARE_LOCALHOST])
  assert.deepEqual(skipsMatchingServerRoot([PORT_SCOPED_LOCALHOST, 'node_modules', '(^|/)dist/']), [])
})

test('the probe does not see a port-shaped pattern; the skipped-root check is the backstop', () => {
  const portShaped = '^https?://localhost:\\d{5}/'
  assert.deepEqual(skipsMatchingServerRoot([portShaped]), [])
  const s = summarizeReport([{ url: 'http://localhost:54321/README.md', state: 'SKIPPED', status: null, parent: null }])
  assert.equal(s.hollow, true)
})

test('an empty report is a hollow sweep', () => {
  const s = summarizeReport([])
  assert.equal(s.checked, 0)
  assert.equal(s.hollow, true)
})

test('a skipped crawl root is a hollow sweep even when linkinator passed', () => {
  const s = summarizeReport([{ url: 'README.md', state: 'SKIPPED', status: null, parent: null }])
  assert.equal(s.checked, 1)
  assert.deepEqual(s.skippedRoots, ['README.md'])
  assert.equal(s.hollow, true)
})

test('a real crawl counts roots, externals, skips and breaks', () => {
  const s = summarizeReport([
    { url: 'README.md', state: 'OK', status: 200, parent: null },
    { url: 'docs/a.md', state: 'OK', status: 200, parent: 'README.md' },
    { url: 'http://localhost:3000/x', state: 'SKIPPED', status: null, parent: 'docs/a.md' },
    { url: 'https://example.com/', state: 'OK', status: 200, parent: 'docs/a.md' },
    { url: 'docs/gone.md', state: 'BROKEN', status: 404, parent: 'docs/a.md' }
  ])
  assert.equal(s.hollow, false)
  assert.deepEqual(s.skippedRoots, [])
  assert.equal(formatSummary(s), 'link-check: 5 links checked (2 external, 1 skipped), 1 broken')
})

// A full sweep runs as several linkinator processes: Socket Firewall proxies
// every fetch of linkinator's own server and gives out once one process has
// made too many. Batches are sized by an estimate of their fetches, carry the
// README.md root anchor (see resolveCrawlFiles), and merge into one report.

test('linkTargets counts unique fetch targets: relative links resolved, externals without fragments, anchors and mailto dropped', () => {
  const text = [
    '[a](./a.md) [b](../b.md#top) [a again](a.md?x=1) ![img](img/x.png)',
    '[ext](https://example.com/p#frag) [ext2](https://example.com/p) [mail](mailto:x@y.z) [self](#here)',
    '[ref]: ../c.md "title"',
    '[ref2]: <https://example.com/q>'
  ].join('\n')
  assert.deepEqual([...linkTargets('docs/guides/g.md', text)].sort(), [
    'docs/c.md',
    'docs/b.md',
    'docs/guides/a.md',
    'docs/guides/img/x.png',
    'https://example.com/p',
    'https://example.com/q'
  ].sort())
})

test('a list within the fetch budget is a single batch, untouched', () => {
  const linksOf = () => new Set()
  const files = ['README.md', 'docs/a.md', 'docs/b.md']
  assert.deepEqual(batchFiles(files, { budget: 3, linksOf }), [files])
  assert.deepEqual(batchFiles(['docs/a.md'], { budget: 1, linksOf }), [['docs/a.md']])
  assert.deepEqual(batchFiles(['README.md'], { budget: 1, linksOf }), [['README.md']])
})

test('batches close when their estimated fetches would exceed the budget, README.md anchoring each', () => {
  // README carries one link; every docs page carries two, one of them shared.
  const linksOf = (f) => f === 'README.md' ? new Set(['docs/index.md']) : new Set(['docs/shared.md', `${f}.x`])
  const files = ['docs/0.md', 'README.md', 'docs/1.md', 'docs/2.md', 'docs/3.md']
  // Anchor costs 2 (itself + its link). Each page adds itself + its own target, plus shared once per batch.
  assert.deepEqual(batchFiles(files, { budget: 7, linksOf }), [
    ['README.md', 'docs/0.md', 'docs/1.md'],
    ['README.md', 'docs/2.md', 'docs/3.md']
  ])
})

test('a page that alone exceeds the budget still gets its own batch', () => {
  const linksOf = (f) => f === 'docs/big.md' ? new Set(Array.from({ length: 10 }, (_, i) => `docs/t${i}.md`)) : new Set()
  assert.deepEqual(batchFiles(['README.md', 'docs/a.md', 'docs/big.md', 'docs/b.md'], { budget: 3, linksOf }), [
    ['README.md', 'docs/a.md'],
    ['README.md', 'docs/big.md'],
    ['README.md', 'docs/b.md']
  ])
})

test('merged batch reports count a row once per link and page, and fail if any batch failed', () => {
  const readme = { url: 'README.md', state: 'OK', status: 200, parent: null }
  const ext = (parent) => ({ url: 'https://example.com/', state: 'OK', status: 200, parent })
  const merged = mergeReports([
    { passed: true, links: [readme, ext('docs/a.md')] },
    { passed: false, links: [readme, ext('docs/a.md'), ext('docs/b.md'), { url: 'docs/gone.md', state: 'BROKEN', status: 404, parent: 'docs/b.md' }] }
  ])
  assert.equal(merged.passed, false)
  assert.equal(merged.links.length, 4)
  assert.equal(summarizeReport(merged.links).broken.length, 1)
})

test('LINK_CHECK_FORMAT is a switch: json on, unset off, anything else refused', () => {
  assert.equal(wantsStdoutReport({}), false)
  assert.equal(wantsStdoutReport({ LINK_CHECK_FORMAT: '' }), false)
  assert.equal(wantsStdoutReport({ LINK_CHECK_FORMAT: 'json' }), true)
  assert.throws(() => wantsStdoutReport({ LINK_CHECK_FORMAT: 'csv' }), /only stdout report is json/)
})
