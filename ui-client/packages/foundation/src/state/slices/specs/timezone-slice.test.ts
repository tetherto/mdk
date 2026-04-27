import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TimezoneState } from '@/types/redux'
import { timezoneSlice } from '../timezone-slice'

describe('timezoneSlice', () => {
  const getInitialState = (): TimezoneState => ({
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should use browser timezone as default', () => {
      const state = timezoneSlice.reducer(undefined, { type: 'unknown' })

      expect(state.timezone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone)
    })

    it('should have correct slice name', () => {
      expect(timezoneSlice.name).toBe('timezone')
    })
  })

  describe('setTimezone', () => {
    it.each(['America/New_York', 'Europe/London', 'Asia/Tokyo', 'UTC', 'America/Los_Angeles'])(
      'should set timezone to %s',
      (tz) => {
        const state = timezoneSlice.reducer(
          getInitialState(),
          timezoneSlice.actions.setTimezone(tz),
        )

        expect(state.timezone).toBe(tz)
      },
    )

    it('should update existing timezone', () => {
      const initial: TimezoneState = { timezone: 'UTC' }

      const state = timezoneSlice.reducer(
        initial,
        timezoneSlice.actions.setTimezone('America/New_York'),
      )

      expect(state.timezone).toBe('America/New_York')
    })

    it('should handle empty string', () => {
      const state = timezoneSlice.reducer(getInitialState(), timezoneSlice.actions.setTimezone(''))

      expect(state.timezone).toBe('')
    })

    it('should not mutate original state', () => {
      const initial: TimezoneState = { timezone: 'UTC' }
      const copy = { ...initial }

      timezoneSlice.reducer(initial, timezoneSlice.actions.setTimezone('America/New_York'))

      expect(initial).toEqual(copy)
    })
  })

  describe('action creators', () => {
    it('should create setTimezone action with payload', () => {
      const action = timezoneSlice.actions.setTimezone('America/Chicago')

      expect(action).toEqual({
        type: 'timezone/setTimezone',
        payload: 'America/Chicago',
      })
    })
  })

  describe('multiple updates', () => {
    it('should handle sequential timezone changes', () => {
      let state = timezoneSlice.reducer(undefined, { type: 'unknown' })

      state = timezoneSlice.reducer(state, timezoneSlice.actions.setTimezone('UTC'))
      expect(state.timezone).toBe('UTC')

      state = timezoneSlice.reducer(state, timezoneSlice.actions.setTimezone('America/New_York'))
      expect(state.timezone).toBe('America/New_York')

      state = timezoneSlice.reducer(state, timezoneSlice.actions.setTimezone('Asia/Tokyo'))
      expect(state.timezone).toBe('Asia/Tokyo')
    })
  })
})
