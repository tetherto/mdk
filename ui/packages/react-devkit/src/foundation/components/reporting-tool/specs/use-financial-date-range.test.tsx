import { act, render, renderHook, waitFor } from '@testing-library/react'
import { endOfMonth } from 'date-fns/endOfMonth'
import { startOfMonth } from 'date-fns/startOfMonth'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PERIOD } from '@/constants/ranges'
import { rangeDatesToFinancialMs, useFinancialDateRange } from '../use-financial-date-range'

describe('rangeDatesToFinancialMs', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('maps a full calendar month to start/end of month in the target zone', () => {
    const start = new Date(2025, 0, 1)
    const end = new Date(2025, 0, 31)
    const result = rangeDatesToFinancialMs([start, end], 'UTC')
    expect(result).not.toBeNull()
    expect(result!.start).toBe(new Date('2025-01-01T00:00:00.000Z').getTime())
    expect(result!.end).toBe(new Date('2025-01-31T23:59:59.999Z').getTime())
  })

  it('does not treat a multi-month span as a full month when day numbers coincide', () => {
    const start = new Date(2025, 1, 1)
    const end = new Date(2025, 3, 28)
    const result = rangeDatesToFinancialMs([start, end], 'UTC')
    expect(result).not.toBeNull()
    expect(result!.start).toBe(new Date('2025-02-01T00:00:00.000Z').getTime())
    expect(result!.end).toBe(new Date('2025-04-28T23:59:59.999Z').getTime())
  })

  it('clamps end to end-of-yesterday in zone when selection end is still in the future', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-15T12:00:00.000Z'))
    const start = new Date(2025, 5, 1)
    const end = new Date(2025, 5, 30)
    const result = rangeDatesToFinancialMs([start, end], 'UTC')
    expect(result).not.toBeNull()
    expect(result!.end).toBe(new Date('2025-06-14T23:59:59.999Z').getTime())
  })
})

describe('useFinancialDateRange', () => {
  it('returns hook shape', async () => {
    const { result } = renderHook(() => useFinancialDateRange({ timezone: 'UTC' }))
    await waitFor(() => {
      expect(result.current.dateRange).not.toBeNull()
    })
    expect(result.current).toHaveProperty('handleRangeChange')
    expect(result.current).toHaveProperty('onDateRangeReset')
    expect(result.current).toHaveProperty('datePicker')
  })

  it('seeds current month with defaultPeriod after mount', async () => {
    const now = new Date()
    const expectedMs = rangeDatesToFinancialMs([startOfMonth(now), endOfMonth(now)], 'UTC')
    expect(expectedMs).not.toBeNull()

    const { result } = renderHook(() =>
      useFinancialDateRange({ timezone: 'UTC', defaultPeriod: PERIOD.DAILY }),
    )
    await waitFor(() => {
      expect(result.current.dateRange).toEqual({
        start: expectedMs!.start,
        end: expectedMs!.end,
        period: PERIOD.DAILY,
      })
    })
  })

  it('handleRangeChange does nothing when dates is null', async () => {
    const { result } = renderHook(() => useFinancialDateRange({ timezone: 'UTC' }))
    await waitFor(() => expect(result.current.dateRange).not.toBeNull())
    const before = result.current.dateRange

    act(() => {
      result.current.handleRangeChange(null)
    })

    expect(result.current.dateRange).toEqual(before)
  })

  it('handleRangeChange updates range and period', async () => {
    const { result } = renderHook(() => useFinancialDateRange({ timezone: 'UTC' }))
    await waitFor(() => expect(result.current.dateRange).not.toBeNull())

    act(() => {
      result.current.handleRangeChange([new Date(2025, 0, 1), new Date(2025, 0, 31)], {
        period: PERIOD.DAILY,
      })
    })

    expect(result.current.dateRange?.period).toBe(PERIOD.DAILY)
    expect(result.current.dateRange?.start).toBe(new Date('2025-01-01T00:00:00.000Z').getTime())
    expect(result.current.dateRange?.end).toBe(new Date('2025-01-31T23:59:59.999Z').getTime())
  })

  it('defaults period to defaultPeriod when rangeOptions omit period', async () => {
    const { result } = renderHook(() => useFinancialDateRange({ timezone: 'UTC' }))
    await waitFor(() => expect(result.current.dateRange).not.toBeNull())

    act(() => {
      result.current.handleRangeChange([new Date(2025, 0, 5), new Date(2025, 0, 10)])
    })

    expect(result.current.dateRange?.period).toBe(PERIOD.DAILY)
  })

  it('defaults period to explicit defaultPeriod when rangeOptions omit period', async () => {
    const { result } = renderHook(() =>
      useFinancialDateRange({ timezone: 'UTC', defaultPeriod: PERIOD.MONTHLY }),
    )
    await waitFor(() => expect(result.current.dateRange).not.toBeNull())

    act(() => {
      result.current.handleRangeChange([new Date(2025, 0, 5), new Date(2025, 0, 10)])
    })

    expect(result.current.dateRange?.period).toBe(PERIOD.MONTHLY)
  })

  it('onDateRangeReset restores current month default', async () => {
    const { result } = renderHook(() =>
      useFinancialDateRange({ timezone: 'UTC', defaultPeriod: PERIOD.MONTHLY }),
    )
    await waitFor(() => expect(result.current.dateRange).not.toBeNull())

    act(() => {
      result.current.handleRangeChange([new Date(2025, 0, 1), new Date(2025, 0, 31)], {
        period: PERIOD.DAILY,
      })
    })

    act(() => {
      result.current.onDateRangeReset()
    })

    const now = new Date()
    const expectedMs = rangeDatesToFinancialMs([startOfMonth(now), endOfMonth(now)], 'UTC')
    expect(expectedMs).not.toBeNull()
    expect(result.current.dateRange).toEqual({
      start: expectedMs!.start,
      end: expectedMs!.end,
      period: PERIOD.MONTHLY,
    })
  })

  it('datePicker renders DateRangePicker trigger', async () => {
    const { result } = renderHook(() => useFinancialDateRange({ timezone: 'UTC' }))
    await waitFor(() => expect(result.current.dateRange).not.toBeNull())

    const { container } = render(<div>{result.current.datePicker}</div>)
    expect(container.querySelector('.mdk-date-picker__trigger')).toBeTruthy()
  })
})
