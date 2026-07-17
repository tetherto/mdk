import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { makeConsumerFixture } from '../test-utils.js'
import { runBlueprint, runBlueprints } from './blueprints.js'

describe('runBlueprints', () => {
  let fixture: ReturnType<typeof makeConsumerFixture>
  beforeEach(() => {
    fixture = makeConsumerFixture()
  })
  afterEach(() => fixture.dispose())

  it('format json: outputs a valid JSON array with expected fields', () => {
    const lines: string[] = []
    runBlueprints({
      packageName: '@tetherto/mdk-react-devkit',
      format: 'json',
      cwd: fixture.dir,
      out: (l) => lines.push(l),
    })

    const output = lines.join('\n')
    const parsed = JSON.parse(output) as Array<Record<string, unknown>>
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed.length).toBeGreaterThan(0)

    const first = parsed[0]!
    expect(first).toHaveProperty('id')
    expect(first).toHaveProperty('title')
    expect(first).toHaveProperty('intent')
    expect(first).toHaveProperty('domain')
    expect(first).toHaveProperty('kernelCapabilities')
    expect(first).toHaveProperty('components')
    expect(first).toHaveProperty('hooks')
  })

  it('format table: output contains header row', () => {
    const lines: string[] = []
    runBlueprints({
      packageName: '@tetherto/mdk-react-devkit',
      format: 'table',
      cwd: fixture.dir,
      out: (l) => lines.push(l),
    })

    const output = lines.join('\n')
    expect(output).toMatch(/Blueprints:/)
    expect(output).toMatch(/Id/)
    expect(output).toMatch(/Domain/)
    expect(output).toMatch(/Title/)
  })

  it('throws when blueprints manifest is not found', () => {
    // Use a cwd that has no node_modules at all
    expect(() =>
      runBlueprints({
        packageName: '@tetherto/mdk-react-devkit',
        cwd: '/tmp',
      }),
    ).toThrow()
  })

  it('uses console.log as the default `out` sink', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    try {
      runBlueprints({
        packageName: '@tetherto/mdk-react-devkit',
        cwd: fixture.dir,
      })
      expect(spy).toHaveBeenCalled()
    } finally {
      spy.mockRestore()
    }
  })
})

describe('runBlueprint', () => {
  let fixture: ReturnType<typeof makeConsumerFixture>
  beforeEach(() => {
    fixture = makeConsumerFixture()
  })
  afterEach(() => fixture.dispose())

  it('single lookup: output contains blueprint title', () => {
    const lines: string[] = []
    runBlueprint({
      packageName: '@tetherto/mdk-react-devkit',
      id: 'alerts',
      cwd: fixture.dir,
      out: (l) => lines.push(l),
    })

    const output = lines.join('\n')
    expect(output).toMatch(/Alerts/)
    expect(output).toMatch(/Intent:/)
    expect(output).toMatch(/Domain:/)
    expect(output).toMatch(/Components:/)
  })

  it('throws when blueprint id is not found', () => {
    expect(() =>
      runBlueprint({
        packageName: '@tetherto/mdk-react-devkit',
        id: 'definitely-not-a-blueprint',
        cwd: fixture.dir,
        out: () => {},
      }),
    ).toThrow(/not found/)
  })

  it('throws when blueprints manifest is missing', () => {
    expect(() =>
      runBlueprint({
        packageName: '@tetherto/mdk-react-devkit',
        id: 'alerts',
        cwd: '/tmp',
        out: () => {},
      }),
    ).toThrow()
  })

  it('uses console.log as the default `out` sink', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    try {
      runBlueprint({
        packageName: '@tetherto/mdk-react-devkit',
        id: 'alerts',
        cwd: fixture.dir,
      })
      expect(spy).toHaveBeenCalled()
    } finally {
      spy.mockRestore()
    }
  })
})
