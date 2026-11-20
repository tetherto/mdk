import test from 'node:test'
import assert from 'node:assert/strict'

import { readFileSync } from 'node:fs'
import {
  resolveScope,
  sourcesOf,
  externalPage,
  summarizeReport,
  formatSummary,
  wantsStdoutReport
} from '../docs/scripts/link-check.mjs'

const ALL = ['README.md', 'docs/a.md', 'docs/b.md', 'ui/hook.ts']

test('no args → every file in scope', () => {
  assert.deepEqual(resolveScope(ALL, []), { files: ALL, scoped: false })
})

test('flag-only args → full sweep, never an empty one (regression guard)', () => {
  // A flag must never read as a zero-file scope: that would collapse the nightly sweep.
  assert.deepEqual(resolveScope(ALL, ['--format', 'json']), { files: ALL, scoped: false })
  assert.deepEqual(resolveScope(ALL, ['--offline']), { files: ALL, scoped: false })
})

test('explicit tracked files → scoped to exactly those, flags ignored', () => {
  assert.deepEqual(resolveScope(ALL, ['--format', 'json', 'docs/a.md', 'ui/hook.ts']), { files: ['docs/a.md', 'ui/hook.ts'], scoped: true })
})

test('args naming no tracked file → full sweep (safe superset)', () => {
  assert.deepEqual(resolveScope(ALL, ['deleted.md']), { files: ALL, scoped: false })
})

// --- the generated page ------------------------------------------------------

const EXTERNAL = [
  { url: 'https://example.com/a?x=1&y="2"#frag', file: 'docs/a.md', line: 3 },
  { url: 'https://example.com/a?x=1&y="2"#frag', file: 'ui/hook.ts', line: 9 },
  { url: 'https://example.org', file: 'docs/b.md', line: 1 }
]

test('the page carries each unique URL once, attribute-escaped, and nothing local', () => {
  const page = externalPage(EXTERNAL)
  assert.equal(page.match(/<a href=/g).length, 2)
  assert.ok(page.includes('<a href="https://example.com/a?x=1&amp;y=&quot;2&quot;#frag">'))
  assert.ok(!/href="(?!https?:)/.test(page), 'every href is absolute')
})

test('a reported URL maps back to every source line, as linkinator normalizes it, with or without its fragment', () => {
  const sources = sourcesOf(EXTERNAL)
  assert.deepEqual(sources.get('https://example.com/a?x=1&y=%222%22#frag'), ['docs/a.md:3', 'ui/hook.ts:9'])
  assert.deepEqual(sources.get('https://example.com/a?x=1&y=%222%22'), ['docs/a.md:3', 'ui/hook.ts:9'])
  assert.deepEqual(sources.get('https://example.org/'), ['docs/b.md:1'])
})

// --- config and hollow-sweep guard -------------------------------------------

test('linkinator.config.json: external-only, one page deep, and every skip entry carries a note', () => {
  const config = JSON.parse(readFileSync('linkinator.config.json', 'utf8'))
  assert.equal(config.recurse, false, 'recursing would crawl the sites the docs link to')
  for (const entry of config.skip) {
    assert.ok(config._skip_notes[entry], `no _skip_notes entry for ${entry}`)
    assert.match(entry, /^\^?https?:/, `${entry} is not a URL: in-repo links never reach linkinator, so a path entry skips nothing`)
  }
})

const ROOT = { url: 'http://localhost:54321/external-links.html', state: 'OK', status: 200 }

test('an empty report, a skipped page, or a page with no links is a hollow sweep in any run, even when linkinator passed', () => {
  for (const scoped of [false, true]) {
    assert.equal(summarizeReport([], { scoped }).hollow, true)
    assert.equal(summarizeReport([{ ...ROOT, state: 'SKIPPED', status: null }], { scoped }).hollow, true)
    assert.equal(summarizeReport([ROOT], { scoped }).hollow, true, 'linkinator found no link on the page')
  }
})

test('every link skipped is hollow for the full sweep, but not for a scoped run whose files carry only skipped URLs', () => {
  const skipped = (url) => ({ url, state: 'SKIPPED', status: null, parent: ROOT.url })
  const rows = [ROOT, skipped('https://qvac.tether.io/'), skipped('https://console.cloud.google.com/')]
  assert.equal(summarizeReport(rows).hollow, true, 'a skip pattern that swallows the whole tree')
  assert.equal(summarizeReport(rows, { scoped: true }).hollow, false, 'a page whose only external URL is on the skip list')
})

test('a real run counts fetched, skipped, broken and warned links, not the page itself', () => {
  const parent = ROOT.url
  const s = summarizeReport([
    ROOT,
    { url: 'https://example.com/', state: 'OK', status: 200, parent },
    { url: 'https://qvac.tether.io/', state: 'SKIPPED', status: null, parent },
    { url: 'https://example.com/gone', state: 'BROKEN', status: 404, parent },
    // A status the config downgrades to `warn` comes back OK, still carrying the status.
    { url: 'https://console.cloud.google.com/', state: 'OK', status: 401, parent }
  ])
  assert.equal(s.hollow, false)
  assert.deepEqual(s.broken.map((l) => l.url), ['https://example.com/gone'])
  assert.equal(
    formatSummary({ files: 310, failures: 2 }, s),
    'link-check: 310 files resolved offline (2 broken), 4 external links fetched (1 skipped, 1 broken, 1 warned)'
  )
})

test('the closing line says so when the network half did not run', () => {
  assert.equal(formatSummary({ files: 310, failures: 0 }, null), 'link-check: 310 files resolved offline (0 broken), no external links fetched')
})

test('LINK_CHECK_FORMAT is a switch: json on, unset off, anything else refused', () => {
  assert.equal(wantsStdoutReport({}), false)
  assert.equal(wantsStdoutReport({ LINK_CHECK_FORMAT: '' }), false)
  assert.equal(wantsStdoutReport({ LINK_CHECK_FORMAT: 'json' }), true)
  assert.throws(() => wantsStdoutReport({ LINK_CHECK_FORMAT: 'csv' }), /only stdout report is json/)
})
