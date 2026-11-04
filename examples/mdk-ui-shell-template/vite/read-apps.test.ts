import { describe, expect, it } from 'vitest'

import { readApps } from './read-apps'

const entry = (overrides: Record<string, unknown> = {}) => ({
  name: 'sentinel',
  id: 'io.tether.sentinel',
  version: '0.1.0',
  displayName: 'Sentinel',
  apiBase: '/apps/sentinel',
  dir: '/stack/node_modules/sentinel',
  ...overrides,
})

const read = (apps: unknown) => readApps(JSON.stringify(apps))

describe('readApps', () => {
  it('is empty without the variable', () => {
    expect(readApps(undefined)).toEqual([])
    expect(readApps('')).toEqual([])
  })

  it('reads the apps mdk run dashboard passes in', () => {
    expect(read([entry()])).toEqual([entry()])
  })

  it('accepts an empty apiBase, which the CLI sends for an app mounted at /', () => {
    const agent = entry({ name: 'agent', id: 'io.tether.agent', apiBase: '' })
    expect(read([agent])).toEqual([agent])
  })

  it('still rejects a missing or non-string apiBase', () => {
    const { apiBase: _, ...noApiBase } = entry()
    expect(() => read([noApiBase])).toThrow('needs a string "apiBase"')
    expect(() => read([entry({ apiBase: null })])).toThrow('needs a string "apiBase"')
  })

  it('rejects an empty required field', () => {
    expect(() => read([entry({ dir: '' })])).toThrow('needs a string "dir"')
  })

  it('rejects a name that is not one plain path segment', () => {
    expect(() => read([entry({ name: '../evil' })])).toThrow('is not a valid app name')
  })

  it('rejects malformed input', () => {
    expect(() => readApps('{')).toThrow('is not valid JSON')
    expect(() => read({ apps: [] })).toThrow('must be a JSON array')
    expect(() => read([null])).toThrow('must be an object')
  })
})
