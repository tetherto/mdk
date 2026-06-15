import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { runExample } from './example.js'
import { makeConsumerFixture } from '../test-utils.js'

const capture = (): { sink: (s: string) => void; out: string[] } => {
  const out: string[] = []
  return { sink: (s: string) => out.push(s), out }
}

describe('runExample', () => {
  let fixture: ReturnType<typeof makeConsumerFixture>
  beforeEach(() => {
    fixture = makeConsumerFixture()
  })
  afterEach(() => fixture.dispose())

  it('prints the example file for a documented component', () => {
    const { sink, out } = capture()
    runExample({
      packageName: '@tetherto/mdk-react-devkit',
      componentName: 'LineChartCard',
      cwd: fixture.dir,
      out: sink,
    })
    const text = out.join('\n')
    expect(text).toMatch(/from ['"]@tetherto\/mdk-react-devkit['"]/)
    expect(text).toMatch(/LineChartCard/)
  })

  it('throws if the component is not in the registry', () => {
    expect(() =>
      runExample({
        packageName: '@tetherto/mdk-react-devkit',
        componentName: 'DefinitelyNotAComponent',
        cwd: fixture.dir,
        out: () => {},
      }),
    ).toThrow(/not found/)
  })

  it('prints the example file for Accordion (core component with co-located example)', () => {
    // Every public agent-ready component ships a co-located *.example.tsx; Accordion is one of them.
    const { sink, out } = capture()
    runExample({
      packageName: '@tetherto/mdk-react-devkit',
      componentName: 'Accordion',
      cwd: fixture.dir,
      out: sink,
    })
    const text = out.join('\n')
    expect(text).toMatch(/from ['"]@tetherto\/mdk-react-devkit['"]/)
    expect(text).toMatch(/Accordion/)
  })

  it('uses console.log when no `out` sink is provided', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    try {
      runExample({
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
