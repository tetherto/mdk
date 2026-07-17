import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { runStores } from './stores.js'
import { makeConsumerFixture, noop } from '../test-utils.js'

const captureLines = (): { sink: (s: string) => void; out: string[] } => {
  const out: string[] = []
  return { sink: (s: string) => out.push(s), out }
}

describe('runStores', () => {
  let fixture: ReturnType<typeof makeConsumerFixture>
  beforeEach(() => {
    fixture = makeConsumerFixture()
  })
  afterEach(() => fixture.dispose())

  it('prints valid JSON with every store and query helper', () => {
    const { sink, out } = captureLines()
    runStores({ cwd: fixture.dir, out: sink })
    const parsed = JSON.parse(out.join('\n'))
    expect(parsed.package).toBe('@tetherto/mdk-ui-foundation')
    expect(parsed.stores.map((s: { name: string }) => s.name).sort()).toEqual([
      'actionsStore',
      'authStore',
      'devicesStore',
      'notificationStore',
      'timezoneStore',
    ])
    expect(
      parsed.queryHelpers.some((q: { name: string }) => q.name === 'createMdkQueryClient'),
    ).toBe(true)
  })

  it('filters by --category', () => {
    const { sink, out } = captureLines()
    runStores({ cwd: fixture.dir, category: 'auth', out: sink })
    const parsed = JSON.parse(out.join('\n'))
    expect(parsed.stores).toHaveLength(1)
    expect(parsed.stores[0].name).toBe('authStore')
    expect(parsed.stores[0].actions.some((a: { name: string }) => a.name === 'setToken')).toBe(true)
  })

  it('renders a table when --format table is passed', () => {
    const { sink, out } = captureLines()
    runStores({ cwd: fixture.dir, format: 'table', out: sink })
    expect(out[0]).toMatch(/^Stores/)
    expect(out.some((l) => l.includes('Name'))).toBe(true)
    expect(out.some((l) => l.includes('authStore'))).toBe(true)
    expect(out.some((l) => l.includes('Query helpers'))).toBe(true)
  })

  it('throws when the stores manifest cannot be resolved', () => {
    const empty = mkdtempSync(join(tmpdir(), 'mdk-stores-missing-'))
    try {
      expect(() =>
        runStores({ packageName: '@tetherto/does-not-exist', cwd: empty, out: noop }),
      ).toThrow(/stores\.json not found/)
    } finally {
      rmSync(empty, { recursive: true, force: true })
    }
  })

  it('uses console.log when no `out` sink is provided', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    try {
      runStores({ cwd: fixture.dir })
      expect(spy).toHaveBeenCalled()
    } finally {
      spy.mockRestore()
    }
  })
})
