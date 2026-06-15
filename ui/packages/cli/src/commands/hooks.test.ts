import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { runHooks } from './hooks.js'
import { makeConsumerFixture, noop } from '../test-utils.js'

const captureLines = (): { sink: (s: string) => void; out: string[] } => {
  const out: string[] = []
  return { sink: (s: string) => out.push(s), out }
}

describe('runHooks', () => {
  let fixture: ReturnType<typeof makeConsumerFixture>
  beforeEach(() => {
    fixture = makeConsumerFixture()
  })
  afterEach(() => fixture.dispose())

  it('prints valid JSON with the adapter package, every hook, and the provider', () => {
    const { sink, out } = captureLines()
    runHooks({ cwd: fixture.dir, out: sink })
    const parsed = JSON.parse(out.join('\n'))
    expect(parsed.package).toBe('@tetherto/mdk-react-adapter')
    expect(Array.isArray(parsed.hooks)).toBe(true)
    expect(parsed.hooks.length).toBeGreaterThan(0)
    expect(parsed.provider?.name).toBe('MdkProvider')
    expect(parsed.hooks.some((h: { name: string }) => h.name === 'useAuth')).toBe(true)
  })

  it('filters by --category', () => {
    const { sink, out } = captureLines()
    runHooks({ cwd: fixture.dir, category: 'store', out: sink })
    const parsed = JSON.parse(out.join('\n'))
    expect(parsed.hooks.length).toBeGreaterThan(0)
    expect(parsed.hooks.every((h: { category: string }) => h.category === 'store')).toBe(true)
  })

  it('renders a table when --format table is passed', () => {
    const { sink, out } = captureLines()
    runHooks({ cwd: fixture.dir, format: 'table', out: sink })
    expect(out[0]).toMatch(/^Hooks/)
    expect(out.some((l) => l.includes('Name'))).toBe(true)
    expect(out.some((l) => l.includes('useAuth'))).toBe(true)
  })

  it('throws when the hooks manifest cannot be resolved', () => {
    const empty = mkdtempSync(join(tmpdir(), 'mdk-hooks-missing-'))
    try {
      expect(() =>
        runHooks({ packageName: '@tetherto/does-not-exist', cwd: empty, out: noop }),
      ).toThrow(/hooks\.json not found/)
    } finally {
      rmSync(empty, { recursive: true, force: true })
    }
  })

  it('uses console.log when no `out` sink is provided', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    try {
      runHooks({ cwd: fixture.dir })
      expect(spy).toHaveBeenCalled()
    } finally {
      spy.mockRestore()
    }
  })
})
