import { act, renderHook } from '@testing-library/react'
import * as dateFnsTz from 'date-fns-tz'
import { useDispatch, useSelector } from 'react-redux'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DATE_TIME_FORMAT_WITH_SECONDS } from '../../constants/dates'
import { timezoneSlice } from '../../state/slices/timezone-slice'
import { useTimezone } from '../use-timezone'

vi.mock('react-redux', () => ({
  useDispatch: vi.fn(),
  useSelector: vi.fn(),
}))

vi.mock('date-fns-tz', () => ({
  toZonedTime: vi.fn(),
  format: vi.fn(),
}))

describe('useTimezone', () => {
  const mockDispatch = vi.fn()
  const mockDate = new Date('2024-01-15T12:30:45Z')
  const mockZonedDate = new Date('2024-01-15T14:30:45')

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useDispatch).mockReturnValue(mockDispatch)
    vi.mocked(useSelector).mockReturnValue('America/New_York')
    vi.mocked(dateFnsTz.toZonedTime).mockReturnValue(mockZonedDate)
    vi.mocked(dateFnsTz.format).mockReturnValue('2024-01-15 14:30:45')
  })

  describe('timezone state', () => {
    it('should return current timezone from Redux', () => {
      const { result } = renderHook(() => useTimezone())

      expect(result.current.timezone).toBe('America/New_York')
    })

    it.each(['UTC', 'Europe/London', 'Asia/Tokyo'])('should handle timezone: %s', (tz) => {
      vi.mocked(useSelector).mockReturnValue(tz)
      const { result } = renderHook(() => useTimezone())

      expect(result.current.timezone).toBe(tz)
    })
  })

  describe('getFormattedDate', () => {
    it('should format date with current timezone', () => {
      const { result } = renderHook(() => useTimezone())

      const formatted = result.current.getFormattedDate(mockDate)

      expect(dateFnsTz.toZonedTime).toHaveBeenCalledWith(mockDate, 'America/New_York')
      expect(dateFnsTz.format).toHaveBeenCalledWith(mockZonedDate, DATE_TIME_FORMAT_WITH_SECONDS, {
        timeZone: 'America/New_York',
      })
      expect(formatted).toBe('2024-01-15 14:30:45')
    })

    it('should use fixed timezone when provided', () => {
      const { result } = renderHook(() => useTimezone())

      result.current.getFormattedDate(mockDate, 'Europe/London')

      expect(dateFnsTz.toZonedTime).toHaveBeenCalledWith(mockDate, 'Europe/London')
      expect(dateFnsTz.format).toHaveBeenCalledWith(mockZonedDate, DATE_TIME_FORMAT_WITH_SECONDS, {
        timeZone: 'Europe/London',
      })
    })

    it('should use custom format when provided', () => {
      const { result } = renderHook(() => useTimezone())
      const customFormat = 'yyyy-MM-dd HH:mm'

      result.current.getFormattedDate(mockDate, undefined, customFormat)

      expect(dateFnsTz.format).toHaveBeenCalledWith(mockZonedDate, customFormat, {
        timeZone: 'America/New_York',
      })
    })

    it('should handle both timezone and format overrides', () => {
      const { result } = renderHook(() => useTimezone())

      result.current.getFormattedDate(mockDate, 'Asia/Tokyo', 'yyyy-MM-dd')

      expect(dateFnsTz.toZonedTime).toHaveBeenCalledWith(mockDate, 'Asia/Tokyo')
      expect(dateFnsTz.format).toHaveBeenCalledWith(mockZonedDate, 'yyyy-MM-dd', {
        timeZone: 'Asia/Tokyo',
      })
    })

    it('should handle timestamp input', () => {
      const { result } = renderHook(() => useTimezone())
      const timestamp = 1705324245000

      result.current.getFormattedDate(timestamp)

      expect(dateFnsTz.toZonedTime).toHaveBeenCalledWith(timestamp, 'America/New_York')
    })

    it('should memoize function when timezone unchanged', () => {
      const { result, rerender } = renderHook(() => useTimezone())
      const first = result.current.getFormattedDate

      rerender()

      expect(result.current.getFormattedDate).toBe(first)
    })

    it('should update function when timezone changes', () => {
      vi.mocked(useSelector).mockReturnValue('UTC')
      const { result, rerender } = renderHook(() => useTimezone())
      const first = result.current.getFormattedDate

      vi.mocked(useSelector).mockReturnValue('Europe/London')
      rerender()

      expect(result.current.getFormattedDate).not.toBe(first)
    })
  })

  describe('changeTimezone', () => {
    it('should dispatch setTimezone action', () => {
      const { result } = renderHook(() => useTimezone())

      act(() => {
        result.current.changeTimezone('Europe/London')
      })

      expect(mockDispatch).toHaveBeenCalledWith(timezoneSlice.actions.setTimezone('Europe/London'))
    })

    it.each(['America/Los_Angeles', 'Asia/Tokyo', 'UTC', ''])(
      'should handle timezone: %s',
      (tz) => {
        const { result } = renderHook(() => useTimezone())

        act(() => {
          result.current.changeTimezone(tz)
        })

        expect(mockDispatch).toHaveBeenCalledWith(timezoneSlice.actions.setTimezone(tz))
      },
    )

    it('should memoize changeTimezone function', () => {
      const { result, rerender } = renderHook(() => useTimezone())
      const first = result.current.changeTimezone

      rerender()

      expect(result.current.changeTimezone).toBe(first)
    })
  })

  describe('return value', () => {
    it('should return all required properties', () => {
      const { result } = renderHook(() => useTimezone())

      expect(result.current).toHaveProperty('getFormattedDate')
      expect(result.current).toHaveProperty('timezone')
      expect(result.current).toHaveProperty('changeTimezone')
      expect(typeof result.current.getFormattedDate).toBe('function')
      expect(typeof result.current.changeTimezone).toBe('function')
      expect(typeof result.current.timezone).toBe('string')
    })
  })

  describe('redux integration', () => {
    it('should call useSelector with correct selector', () => {
      renderHook(() => useTimezone())

      expect(useSelector).toHaveBeenCalledWith(expect.any(Function))
    })

    it('should extract timezone from state.timezone.timezone', () => {
      const mockState = {
        timezone: { timezone: 'America/Chicago' },
      }

      vi.mocked(useSelector).mockImplementation((selector: any) => selector(mockState))

      const { result } = renderHook(() => useTimezone())

      expect(result.current.timezone).toBe('America/Chicago')
    })
  })
})
