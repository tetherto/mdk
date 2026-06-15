import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDashboardDateRange } from '../use-dashboard-date-range'

describe('useDashboardDateRange', () => {
  const NOW = 1_750_000_000_000
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('defaults to a 24-hour window ending now', () => {
    const { result } = renderHook(() => useDashboardDateRange())
    expect(result.current.end).toBe(NOW)
    expect(result.current.end - result.current.start).toBe(24 * 60 * 60 * 1000)
  })

  it('respects an explicit initial range', () => {
    const initial = { start: 1000, end: 2000 }
    const { result } = renderHook(() => useDashboardDateRange({ initial }))
    expect(result.current.start).toBe(1000)
    expect(result.current.end).toBe(2000)
  })

  it('setRange updates the values', () => {
    const { result } = renderHook(() => useDashboardDateRange())
    act(() => result.current.setRange({ start: 10, end: 20 }))
    expect(result.current.start).toBe(10)
    expect(result.current.end).toBe(20)
  })

  it('reset snaps back to the rolling 24-hour window', () => {
    const { result } = renderHook(() => useDashboardDateRange())
    act(() => result.current.setRange({ start: 1, end: 2 }))
    vi.setSystemTime(NOW + 60_000)
    act(() => result.current.reset())
    expect(result.current.end).toBe(NOW + 60_000)
    expect(result.current.end - result.current.start).toBe(24 * 60 * 60 * 1000)
  })
})
