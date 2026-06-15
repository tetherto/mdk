import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { makeConsumerFixture, noop } from '../test-utils.js'
import { runSuggest } from './suggest.js'

describe('runSuggest', () => {
  let fixture: ReturnType<typeof makeConsumerFixture>
  beforeEach(() => {
    fixture = makeConsumerFixture()
  })
  afterEach(() => fixture.dispose())

  it('result object has all expected keys', () => {
    const result = runSuggest({
      packageName: '@tetherto/mdk-react-devkit',
      query: 'button',
      cwd: fixture.dir,
      out: noop,
    })

    expect(result).toHaveProperty('components')
    expect(result).toHaveProperty('hooks')
    expect(result).toHaveProperty('blueprints')
    expect(result).toHaveProperty('adapterHooks')
    expect(result).toHaveProperty('stores')
  })

  it('query "button" returns components with score > 0', () => {
    const result = runSuggest({
      packageName: '@tetherto/mdk-react-devkit',
      query: 'button',
      cwd: fixture.dir,
      out: noop,
    })

    expect(result.components.length).toBeGreaterThan(0)
    expect(result.components.every((c) => c.score > 0)).toBe(true)
  })

  it('respects the limit option', () => {
    const result = runSuggest({
      packageName: '@tetherto/mdk-react-devkit',
      query: 'miner device alert chart',
      limit: 2,
      cwd: fixture.dir,
      out: noop,
    })

    expect(result.components.length).toBeLessThanOrEqual(2)
    expect(result.blueprints.length).toBeLessThanOrEqual(2)
  })

  it('zero-result query returns empty arrays for components and blueprints', () => {
    const result = runSuggest({
      packageName: '@tetherto/mdk-react-devkit',
      query: 'xyzzy-zzz-qqqq-gibberish-random',
      cwd: fixture.dir,
      out: noop,
    })

    expect(result.components).toEqual([])
    expect(result.blueprints).toEqual([])
  })

  it('skips adapter and core scoring when their packages are null', () => {
    const result = runSuggest({
      packageName: '@tetherto/mdk-react-devkit',
      query: 'auth devices',
      adapterPackage: null,
      corePackage: null,
      cwd: fixture.dir,
      out: noop,
    })
    expect(result.adapterHooks).toEqual([])
    expect(result.stores).toEqual([])
  })

  it('uses console.log when no `out` sink is provided', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    try {
      runSuggest({
        packageName: '@tetherto/mdk-react-devkit',
        query: 'button',
        cwd: fixture.dir,
      })
      expect(spy).toHaveBeenCalled()
    } finally {
      spy.mockRestore()
    }
  })

  it('each result item in components has name, score, reasons', () => {
    const result = runSuggest({
      packageName: '@tetherto/mdk-react-devkit',
      query: 'alerts incident',
      cwd: fixture.dir,
      out: noop,
    })

    for (const item of result.components) {
      expect(item).toHaveProperty('name')
      expect(item).toHaveProperty('score')
      expect(item).toHaveProperty('reasons')
      expect(typeof item.name).toBe('string')
      expect(typeof item.score).toBe('number')
      expect(Array.isArray(item.reasons)).toBe(true)
    }
  })
})
