import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { runRegistry } from './registry.js'
import { makeConsumerFixture } from '../test-utils.js'

const captureLines = (): { sink: (s: string) => void; out: string[] } => {
  const out: string[] = []
  return { sink: (s: string) => out.push(s), out }
}

describe('runRegistry', () => {
  let fixture: ReturnType<typeof makeConsumerFixture>
  beforeEach(() => {
    fixture = makeConsumerFixture()
  })
  afterEach(() => fixture.dispose())

  it('prints valid JSON with all public entries by default', () => {
    const { sink, out } = captureLines()
    runRegistry({
      packageName: '@tetherto/mdk-react-devkit',
      cwd: fixture.dir,
      out: sink,
    })
    const parsed = JSON.parse(out.join('\n'))
    expect(parsed.package).toBe('@tetherto/mdk-react-devkit')
    expect(Array.isArray(parsed.components)).toBe(true)
    expect(Array.isArray(parsed.hooks)).toBe(true)
    // Default shows the full public surface (agent-ready + advanced).
    expect(parsed.components.length).toBeGreaterThan(0)
    expect(parsed.components.every((c: { public?: boolean }) => c.public !== false)).toBe(true)
  })

  it('narrows to agent-ready when --tier agent-ready is passed', () => {
    const { sink: defaultSink, out: defaultOut } = captureLines()
    runRegistry({
      packageName: '@tetherto/mdk-react-devkit',
      cwd: fixture.dir,
      out: defaultSink,
    })
    const { sink: narrowSink, out: narrowOut } = captureLines()
    runRegistry({
      packageName: '@tetherto/mdk-react-devkit',
      cwd: fixture.dir,
      tier: 'agent-ready',
      out: narrowSink,
    })
    const defaultLen = JSON.parse(defaultOut.join('\n')).components.length
    const narrowLen = JSON.parse(narrowOut.join('\n')).components.length
    expect(narrowLen).toBeGreaterThan(0)
    expect(narrowLen).toBeLessThan(defaultLen)
  })

  it('filters by explicit --tier advanced', () => {
    const { sink, out } = captureLines()
    runRegistry({
      packageName: '@tetherto/mdk-react-devkit',
      cwd: fixture.dir,
      tier: 'advanced',
      out: sink,
    })
    const parsed = JSON.parse(out.join('\n'))
    expect(parsed.components.length).toBe(11)
    expect(parsed.components.every((c: { tier?: string }) => c.tier === 'advanced')).toBe(true)
    expect(
      parsed.components.every((component: { name?: string }) =>
        /^(?:EnergyReport(?:MinerTypeView|MinerUnitView|SiteView)|Operational(?:HashrateChart|PowerConsumptionChart|SiteEfficiencyChart|MinersStatusChart)|ChartExpandAction|SparePartDetails|CabinetDetailCard|ContainerControlsCard)$/.test(
          component.name ?? '',
        ),
      ),
    ).toBe(true)
  })

  it('filters to components only', () => {
    const { sink, out } = captureLines()
    runRegistry({
      packageName: '@tetherto/mdk-react-devkit',
      cwd: fixture.dir,
      filter: 'components',
      out: sink,
    })
    const parsed = JSON.parse(out.join('\n'))
    expect(Array.isArray(parsed.components)).toBe(true)
    expect(parsed).not.toHaveProperty('hooks')
  })

  it('filters to hooks only', () => {
    const { sink, out } = captureLines()
    runRegistry({
      packageName: '@tetherto/mdk-react-devkit',
      cwd: fixture.dir,
      filter: 'hooks',
      out: sink,
    })
    const parsed = JSON.parse(out.join('\n'))
    expect(Array.isArray(parsed.hooks)).toBe(true)
    expect(parsed).not.toHaveProperty('components')
  })

  it('renders a table when --format table is passed', () => {
    const { sink, out } = captureLines()
    runRegistry({
      packageName: '@tetherto/mdk-react-devkit',
      cwd: fixture.dir,
      format: 'table',
      out: sink,
    })
    expect(out.some((l) => l.startsWith('Components:'))).toBe(true)
    expect(out.some((l) => l.startsWith('Hooks:'))).toBe(true)
    expect(out.some((l) => l.includes('Name'))).toBe(true)
  })

  it('renders a components-only table when --filter components is passed', () => {
    const { sink, out } = captureLines()
    runRegistry({
      packageName: '@tetherto/mdk-react-devkit',
      cwd: fixture.dir,
      filter: 'components',
      format: 'table',
      out: sink,
    })
    expect(out.some((l) => l.startsWith('Components:'))).toBe(true)
    expect(out.some((l) => l.startsWith('Hooks:'))).toBe(false)
  })

  it('renders a hooks-only table when --filter hooks is passed', () => {
    const { sink, out } = captureLines()
    runRegistry({
      packageName: '@tetherto/mdk-react-devkit',
      cwd: fixture.dir,
      filter: 'hooks',
      format: 'table',
      out: sink,
    })
    expect(out.some((l) => l.startsWith('Components:'))).toBe(false)
    expect(out.some((l) => l.startsWith('Hooks:'))).toBe(true)
  })

  it('honours --includeInternal by surfacing every entry', () => {
    const { sink, out } = captureLines()
    runRegistry({
      packageName: '@tetherto/mdk-react-devkit',
      cwd: fixture.dir,
      includeInternal: true,
      out: sink,
    })
    const parsed = JSON.parse(out.join('\n'))
    expect(parsed.components.length).toBeGreaterThan(0)
  })

  it('honours --tier all when includeInternal is not set', () => {
    const { sink, out } = captureLines()
    runRegistry({
      packageName: '@tetherto/mdk-react-devkit',
      cwd: fixture.dir,
      tier: 'all',
      out: sink,
    })
    const parsed = JSON.parse(out.join('\n'))
    expect(parsed.components.length).toBeGreaterThan(0)
  })

  it('uses console.log when no `out` sink is provided', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    try {
      runRegistry({
        packageName: '@tetherto/mdk-react-devkit',
        cwd: fixture.dir,
      })
      expect(spy).toHaveBeenCalled()
    } finally {
      spy.mockRestore()
    }
  })
})
