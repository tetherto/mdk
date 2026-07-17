import { describe, expect, it } from 'vitest'

import { DEFAULT_FORBIDDEN_PATTERNS, formatHits, scanFiles, scanText } from './leak-guard.js'

describe('scanText', () => {
  it('matches case-insensitively and reports line + column', () => {
    const hits = scanText('a.md', 'clean line\nsee MDK-PRV here', ['mdk-prv'])
    expect(hits).toHaveLength(1)
    expect(hits[0]).toMatchObject({ file: 'a.md', line: 2, col: 5, match: 'MDK-PRV' })
  })

  it('finds every occurrence on a line', () => {
    const hits = scanText('a.md', 'mdk-prv and mdk-prv', ['mdk-prv'])
    expect(hits.map((h) => h.col)).toEqual([1, 13])
  })

  it('treats patterns as literals, not regex', () => {
    expect(scanText('a.md', 'a.b', ['a.b'])).toHaveLength(1)
    expect(scanText('a.md', 'axb', ['a.b'])).toHaveLength(0)
  })

  it('returns nothing when there are no patterns', () => {
    expect(scanText('a.md', 'mdk-prv', [])).toEqual([])
  })

  it('defaults to guarding the private repo slug', () => {
    expect(DEFAULT_FORBIDDEN_PATTERNS).toContain('mdk-prv')
  })
})

describe('scanFiles', () => {
  it('aggregates hits across every file', () => {
    const files = new Map([
      ['clean.json', 'nothing to see'],
      ['leak.md', 'path/to/mdk-prv/thing'],
      ['also.txt', 'MDK-PRV again'],
    ])
    const hits = scanFiles(files, ['mdk-prv'])
    expect(hits.map((h) => h.file).sort()).toEqual(['also.txt', 'leak.md'])
  })
})

describe('formatHits', () => {
  it('renders file:line:col with the match and excerpt', () => {
    const out = formatHits(scanText('a.md', '  uses mdk-prv internally', ['mdk-prv']))
    expect(out).toContain('a.md:1:8')
    expect(out).toContain('"mdk-prv"')
    expect(out).toContain('uses mdk-prv internally')
  })
})
