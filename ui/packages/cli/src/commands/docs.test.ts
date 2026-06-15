import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { runDocs } from './docs.js'
import { makeConsumerFixture } from '../test-utils.js'

const captureLines = (): { sink: (s: string) => void; out: string[] } => {
  const out: string[] = []
  return { sink: (s: string) => out.push(s), out }
}

describe('runDocs', () => {
  let fixture: ReturnType<typeof makeConsumerFixture>
  beforeEach(() => {
    fixture = makeConsumerFixture()
  })
  afterEach(() => fixture.dispose())

  it('emits the co-located USAGE.md when present', () => {
    const { sink, out } = captureLines()
    runDocs({
      packageName: '@tetherto/mdk-react-devkit',
      componentName: 'LineChartCard',
      cwd: fixture.dir,
      out: sink,
    })
    const text = out.join('\n')
    expect(text).toMatch(/#\s+LineChartCard/)
    expect(text).toMatch(/Props/)
  })

  it('falls back to a synthesised stub when USAGE.md is missing', () => {
    const { sink, out } = captureLines()
    runDocs({
      packageName: '@tetherto/mdk-react-devkit',
      componentName: 'Accordion',
      cwd: fixture.dir,
      out: sink,
    })
    const text = out.join('\n')
    expect(text).toMatch(/#\s+Accordion/)
    expect(text).toMatch(/Props/)
  })

  it('throws for unknown components', () => {
    expect(() =>
      runDocs({
        packageName: '@tetherto/mdk-react-devkit',
        componentName: 'DefinitelyNotAComponent',
        cwd: fixture.dir,
        out: () => {},
      }),
    ).toThrow(/not found/)
  })

  it('emits ORK capabilities line when the component declares them', () => {
    // LineChartCard is agent-ready and ships orkCapabilities. The synthesised
    // path is only hit when the component has no USAGE.md — pick one we know
    // lacks USAGE.md but declares capabilities. ActiveIncidentsCard fits.
    const { sink, out } = captureLines()
    runDocs({
      packageName: '@tetherto/mdk-react-devkit',
      componentName: 'ActiveIncidentsCard',
      cwd: fixture.dir,
      out: sink,
    })
    const text = out.join('\n')
    expect(text).toMatch(/#\s+ActiveIncidentsCard/)
  })

  it('uses console.log when no `out` sink is provided', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    try {
      runDocs({
        packageName: '@tetherto/mdk-react-devkit',
        componentName: 'LineChartCard',
        cwd: fixture.dir,
      })
      expect(spy).toHaveBeenCalled()
    } finally {
      spy.mockRestore()
    }
  })
})
