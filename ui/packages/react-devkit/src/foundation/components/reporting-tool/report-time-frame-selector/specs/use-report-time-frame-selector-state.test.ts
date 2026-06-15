import { act, renderHook } from '@testing-library/react'
import { endOfDay, endOfYesterday, startOfDay, startOfYesterday, sub } from 'date-fns'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useReportTimeFrameSelectorState } from '../use-report-time-frame-selector-state'

const FIXED_NOW = new Date('2026-01-15T10:00:00')

describe('useReportTimeFrameSelectorState', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('defaults to preset 1', () => {
      const { result } = renderHook(() => useReportTimeFrameSelectorState())
      expect(result.current.presetTimeFrame).toBe(1)
    })

    it('initializes dateRange to last month through yesterday', () => {
      const { result } = renderHook(() => useReportTimeFrameSelectorState())
      const expectedStart = startOfDay(sub(startOfYesterday(), { months: 1 }))
      const expectedEnd = endOfYesterday()
      expect(result.current.dateRange[0]).toEqual(expectedStart)
      expect(result.current.dateRange[1]).toEqual(expectedEnd)
    })
  })

  describe('computed start/end with preset', () => {
    it('returns yesterday as start and end for preset = 1', () => {
      const { result } = renderHook(() => useReportTimeFrameSelectorState())
      expect(result.current.start).toEqual(startOfYesterday())
      expect(result.current.end).toEqual(endOfYesterday())
    })

    it('returns 6 days back through yesterday for preset = 7', () => {
      const { result } = renderHook(() => useReportTimeFrameSelectorState())
      act(() => result.current.setPresetTimeFrame(7))
      expect(result.current.start).toEqual(sub(startOfYesterday(), { days: 6 }))
      expect(result.current.end).toEqual(endOfYesterday())
    })

    it('returns 29 days back through yesterday for preset = 30', () => {
      const { result } = renderHook(() => useReportTimeFrameSelectorState())
      act(() => result.current.setPresetTimeFrame(30))
      expect(result.current.start).toEqual(sub(startOfYesterday(), { days: 29 }))
      expect(result.current.end).toEqual(endOfYesterday())
    })
  })

  describe('computed start/end with custom (preset = null)', () => {
    it('returns startOfDay/endOfDay of the dateRange when preset is null', () => {
      const { result } = renderHook(() => useReportTimeFrameSelectorState())
      const customStart = new Date('2026-01-05T14:30:00')
      const customEnd = new Date('2026-01-10T09:00:00')

      act(() => result.current.setPresetTimeFrame(null))
      act(() => result.current.setDateRange([customStart, customEnd]))

      expect(result.current.start).toEqual(startOfDay(customStart))
      expect(result.current.end).toEqual(endOfDay(customEnd))
    })

    it('normalizes partial-day timestamps to start/end of day', () => {
      const { result } = renderHook(() => useReportTimeFrameSelectorState())
      act(() => result.current.setPresetTimeFrame(null))
      act(() =>
        result.current.setDateRange([
          new Date('2026-01-03T12:30:00'),
          new Date('2026-01-08T18:45:00'),
        ]),
      )

      expect(result.current.start.getHours()).toBe(0)
      expect(result.current.start.getMinutes()).toBe(0)
      expect(result.current.end.getHours()).toBe(23)
      expect(result.current.end.getMinutes()).toBe(59)
    })
  })

  describe('setPresetTimeFrame', () => {
    it('updates presetTimeFrame to the given value', () => {
      const { result } = renderHook(() => useReportTimeFrameSelectorState())
      act(() => result.current.setPresetTimeFrame(7))
      expect(result.current.presetTimeFrame).toBe(7)
    })

    it('sets presetTimeFrame to null for custom mode', () => {
      const { result } = renderHook(() => useReportTimeFrameSelectorState())
      act(() => result.current.setPresetTimeFrame(null))
      expect(result.current.presetTimeFrame).toBeNull()
    })
  })

  describe('setDateRange', () => {
    it('updates the dateRange tuple', () => {
      const { result } = renderHook(() => useReportTimeFrameSelectorState())
      const newStart = new Date('2026-01-01')
      const newEnd = new Date('2026-01-07')
      act(() => result.current.setDateRange([newStart, newEnd]))
      expect(result.current.dateRange[0]).toEqual(newStart)
      expect(result.current.dateRange[1]).toEqual(newEnd)
    })

    it('dateRange update does not affect start/end while a preset is active', () => {
      const { result } = renderHook(() => useReportTimeFrameSelectorState())
      act(() => result.current.setDateRange([new Date('2025-06-01'), new Date('2025-06-30')]))
      expect(result.current.start).toEqual(startOfYesterday())
      expect(result.current.end).toEqual(endOfYesterday())
    })
  })
})
