import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useDashboardTimeRange } from '../use-dashboard-time-range'

describe('useDashboardTimeRange', () => {
  it("defaults timeline to '5m' and surfaces the canonical option list", () => {
    const { result } = renderHook(() => useDashboardTimeRange())
    expect(result.current.timeline).toBe('5m')
    expect(result.current.options.length).toBeGreaterThan(0)
    expect(result.current.options.some((o) => o.value === '5m')).toBe(true)
  })

  it('respects an explicit initial value', () => {
    const { result } = renderHook(() => useDashboardTimeRange({ initial: '3h' }))
    expect(result.current.timeline).toBe('3h')
  })

  it('uses a caller-supplied option list verbatim', () => {
    const custom = [{ value: 'x', label: 'X' }]
    const { result } = renderHook(() => useDashboardTimeRange({ options: custom }))
    expect(result.current.options).toBe(custom)
  })

  it('setTimeline updates the value and is stable across renders', () => {
    const { result, rerender } = renderHook(() => useDashboardTimeRange())
    const firstSetter = result.current.setTimeline
    act(() => result.current.setTimeline('1D'))
    expect(result.current.timeline).toBe('1D')
    rerender()
    expect(result.current.setTimeline).toBe(firstSetter)
  })
})
