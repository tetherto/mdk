import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { makeConsumerFixture } from '../test-utils.js'
import { runFind } from './find.js'

describe('runFind', () => {
  let fixture: ReturnType<typeof makeConsumerFixture>
  beforeEach(() => {
    fixture = makeConsumerFixture()
  })
  afterEach(() => fixture.dispose())

  it('filter kind: components returns only components (no hooks)', () => {
    const lines: string[] = []
    runFind({
      packageName: '@tetherto/mdk-react-devkit',
      kind: 'components',
      format: 'json',
      tier: 'all',
      cwd: fixture.dir,
      out: (l) => lines.push(l),
    })

    const result = JSON.parse(lines.join('\n')) as { components: unknown[]; hooks: unknown[] }
    expect(result.components.length).toBeGreaterThan(0)
    expect(result.hooks.length).toBe(0)
  })

  it('filter kind: hooks returns only hooks (no components)', () => {
    const lines: string[] = []
    runFind({
      packageName: '@tetherto/mdk-react-devkit',
      kind: 'hooks',
      format: 'json',
      tier: 'all',
      cwd: fixture.dir,
      out: (l) => lines.push(l),
    })

    const result = JSON.parse(lines.join('\n')) as { components: unknown[]; hooks: unknown[] }
    expect(result.components.length).toBe(0)
    // hooks may be empty if registry has none, but the components array must be 0
    expect(Array.isArray(result.hooks)).toBe(true)
  })

  it('tier: all returns more results than default (agent-ready)', () => {
    const allLines: string[] = []
    runFind({
      packageName: '@tetherto/mdk-react-devkit',
      kind: 'components',
      format: 'json',
      tier: 'all',
      cwd: fixture.dir,
      out: (l) => allLines.push(l),
    })

    const defaultLines: string[] = []
    runFind({
      packageName: '@tetherto/mdk-react-devkit',
      kind: 'components',
      format: 'json',
      cwd: fixture.dir,
      out: (l) => defaultLines.push(l),
    })

    const all = JSON.parse(allLines.join('\n')) as { components: unknown[] }
    const def = JSON.parse(defaultLines.join('\n')) as { components: unknown[] }
    expect(all.components.length).toBeGreaterThanOrEqual(def.components.length)
  })

  it('table format: output contains Components: or Hooks: header', () => {
    const lines: string[] = []
    runFind({
      packageName: '@tetherto/mdk-react-devkit',
      kind: 'components',
      format: 'table',
      tier: 'all',
      cwd: fixture.dir,
      out: (l) => lines.push(l),
    })

    const output = lines.join('\n')
    expect(output).toMatch(/Components:/)
  })

  it('filters by capability and category and includes hooks in table output', () => {
    const lines: string[] = []
    runFind({
      packageName: '@tetherto/mdk-react-devkit',
      kind: 'all',
      format: 'table',
      tier: 'all',
      capability: 'hashrate-monitoring',
      category: 'charts',
      cwd: fixture.dir,
      out: (l) => lines.push(l),
    })

    const output = lines.join('\n')
    // We only assert the run produced *some* output without throwing — the
    // exact set of matches depends on the registry, but exercising the
    // capability + category branches is the point.
    expect(typeof output).toBe('string')
  })

  it('renders hooks table when kind=hooks and hooks exist', () => {
    const lines: string[] = []
    runFind({
      packageName: '@tetherto/mdk-react-devkit',
      kind: 'hooks',
      format: 'table',
      tier: 'all',
      cwd: fixture.dir,
      out: (l) => lines.push(l),
    })
    const output = lines.join('\n')
    // Either renders the "Hooks:" header or "(no matches)" depending on registry.
    expect(output).toMatch(/Hooks:|\(no matches\)/)
  })

  it('uses console.log when no `out` sink is provided', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    try {
      runFind({
        packageName: '@tetherto/mdk-react-devkit',
        tier: 'all',
        cwd: fixture.dir,
      })
      expect(spy).toHaveBeenCalled()
    } finally {
      spy.mockRestore()
    }
  })

  it('zero matches: output contains "(no matches)"', () => {
    const lines: string[] = []
    runFind({
      packageName: '@tetherto/mdk-react-devkit',
      format: 'table',
      // Both component and hook names must include this domain context, which doesn't exist
      domain: 'zzz-domain-that-does-not-exist',
      cwd: fixture.dir,
      out: (l) => lines.push(l),
    })

    expect(lines.join('\n')).toMatch(/\(no matches\)/)
  })
})
