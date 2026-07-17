// @vitest-environment jsdom
import { timezoneStore } from '@tetherto/mdk-ui-foundation'
import { act, renderHook } from '@testing-library/react'
import * as dateFnsTz from 'date-fns-tz'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useTimezoneFormatter } from '../use-timezone'

const DATE_TIME_FORMAT_WITH_SECONDS = 'dd-MM-yyyy HH:mm:ss'

vi.mock('date-fns-tz', () => ({
  toZonedTime: vi.fn(),
  format: vi.fn(),
}))

describe('useTimezoneFormatter', () => {
  const mockDate = new Date('2024-01-15T12:30:45Z')
  const mockZonedDate = new Date('2024-01-15T14:30:45')
  const originalTimezone = timezoneStore.getState().timezone

  beforeEach(() => {
    vi.clearAllMocks()
    act(() => {
      timezoneStore.getState().setTimezone('America/New_York')
    })
    vi.mocked(dateFnsTz.toZonedTime).mockReturnValue(mockZonedDate)
    vi.mocked(dateFnsTz.format).mockReturnValue('2024-01-15 14:30:45')
  })

  afterEach(() => {
    act(() => {
      timezoneStore.getState().setTimezone(originalTimezone)
    })
  })

  describe('timezone state', () => {
    it('returns the current timezone from the zustand store', () => {
      const { result } = renderHook(() => useTimezoneFormatter())
      expect(result.current.timezone).toBe('America/New_York')
    })

    it.each(['UTC', 'Europe/London', 'Asia/Tokyo'])('handles timezone: %s', (tz) => {
      act(() => {
        timezoneStore.getState().setTimezone(tz)
      })
      const { result } = renderHook(() => useTimezoneFormatter())
      expect(result.current.timezone).toBe(tz)
    })
  })

  describe('getFormattedDate', () => {
    it('formats the date using the current timezone', () => {
      const { result } = renderHook(() => useTimezoneFormatter())
      const formatted = result.current.getFormattedDate(mockDate)

      expect(dateFnsTz.toZonedTime).toHaveBeenCalledWith(mockDate, 'America/New_York')
      expect(dateFnsTz.format).toHaveBeenCalledWith(mockZonedDate, DATE_TIME_FORMAT_WITH_SECONDS, {
        timeZone: 'America/New_York',
      })
      expect(formatted).toBe('2024-01-15 14:30:45')
    })

    it('uses the provided fixed timezone when set', () => {
      const { result } = renderHook(() => useTimezoneFormatter())
      result.current.getFormattedDate(mockDate, 'Europe/London')

      expect(dateFnsTz.toZonedTime).toHaveBeenCalledWith(mockDate, 'Europe/London')
      expect(dateFnsTz.format).toHaveBeenCalledWith(mockZonedDate, DATE_TIME_FORMAT_WITH_SECONDS, {
        timeZone: 'Europe/London',
      })
    })

    it('uses a custom format string when provided', () => {
      const { result } = renderHook(() => useTimezoneFormatter())
      const customFormat = 'yyyy-MM-dd HH:mm'
      result.current.getFormattedDate(mockDate, undefined, customFormat)

      expect(dateFnsTz.format).toHaveBeenCalledWith(mockZonedDate, customFormat, {
        timeZone: 'America/New_York',
      })
    })

    it('handles a timestamp input', () => {
      const { result } = renderHook(() => useTimezoneFormatter())
      const timestamp = 1705324245000
      result.current.getFormattedDate(timestamp)

      expect(dateFnsTz.toZonedTime).toHaveBeenCalledWith(timestamp, 'America/New_York')
    })

    it('memoizes the formatter while the timezone is unchanged', () => {
      const { result, rerender } = renderHook(() => useTimezoneFormatter())
      const first = result.current.getFormattedDate
      rerender()
      expect(result.current.getFormattedDate).toBe(first)
    })

    it('returns a new formatter when the timezone changes', () => {
      const { result, rerender } = renderHook(() => useTimezoneFormatter())
      const first = result.current.getFormattedDate

      act(() => {
        timezoneStore.getState().setTimezone('Europe/London')
      })
      rerender()

      expect(result.current.getFormattedDate).not.toBe(first)
    })
  })

  describe('changeTimezone', () => {
    it('updates the timezone in the underlying store', () => {
      const { result } = renderHook(() => useTimezoneFormatter())

      act(() => {
        result.current.changeTimezone('Europe/London')
      })

      expect(timezoneStore.getState().timezone).toBe('Europe/London')
    })

    it.each(['America/Los_Angeles', 'Asia/Tokyo', 'UTC'])('handles timezone: %s', (tz) => {
      const { result } = renderHook(() => useTimezoneFormatter())

      act(() => {
        result.current.changeTimezone(tz)
      })

      expect(timezoneStore.getState().timezone).toBe(tz)
    })

    it('memoizes the changeTimezone callback', () => {
      const { result, rerender } = renderHook(() => useTimezoneFormatter())
      const first = result.current.changeTimezone
      rerender()
      expect(result.current.changeTimezone).toBe(first)
    })
  })

  describe('return value shape', () => {
    it('returns all required properties', () => {
      const { result } = renderHook(() => useTimezoneFormatter())

      expect(result.current).toHaveProperty('getFormattedDate')
      expect(result.current).toHaveProperty('timezone')
      expect(result.current).toHaveProperty('changeTimezone')
      expect(typeof result.current.getFormattedDate).toBe('function')
      expect(typeof result.current.changeTimezone).toBe('function')
      expect(typeof result.current.timezone).toBe('string')
    })
  })
})
