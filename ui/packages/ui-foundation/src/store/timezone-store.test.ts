import { describe, expect, it } from 'vitest'
import { createTimezoneStore } from './timezone-store'

describe('timezoneStore', () => {
  it('starts with the system timezone', () => {
    const store = createTimezoneStore()
    expect(typeof store.getState().timezone).toBe('string')
    expect(store.getState().timezone.length).toBeGreaterThan(0)
  })

  it('setTimezone updates the value', () => {
    const store = createTimezoneStore()
    store.getState().setTimezone('UTC')
    expect(store.getState().timezone).toBe('UTC')
  })
})
