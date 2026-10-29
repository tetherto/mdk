import { act, renderHook } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { SearchParamsState } from '../use-period'
import { usePeriod } from '../use-period'

const NOW = Date.UTC(2026, 9, 23, 12, 30)
const DAY = 86_400_000

// A stand-in for react-router's useSearchParams(), recording each update's options.
const useFakeSearchParams = (
  initial: string,
  calls: Array<{ replace?: boolean }>,
): SearchParamsState => {
  const [params, setParams] = useState(() => new URLSearchParams(initial))
  return [
    params,
    (next, options) => {
      calls.push(options ?? {})
      setParams((prev) => next(prev))
    },
  ]
}

const render = (initial = '') => {
  const calls: Array<{ replace?: boolean }> = []
  const hook = renderHook(() => {
    const search = useFakeSearchParams(initial, calls)
    return { state: usePeriod(search, 'UTC', { preset: '30d' }), params: search[0] }
  })
  return { ...hook, calls }
}

describe('usePeriod', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => vi.useRealTimers())

  it('starts from the defaults when the URL says nothing', () => {
    const { result } = render()
    expect(result.current.state.period).toEqual({ preset: '30d', granularity: 'day' })
    expect(result.current.state.query).toEqual({
      start: NOW - 30 * DAY,
      end: NOW,
      granularity: 'day',
    })
    expect(result.current.state.isDefault).toBe(true)
  })

  it('reads the period from the URL, ignoring values it does not know', () => {
    const { result } = render('range=custom&from=2026-10-01&to=2026-10-07&granularity=hour')
    expect(result.current.state.query).toEqual({
      start: Date.UTC(2026, 9, 1),
      end: Date.UTC(2026, 9, 8),
      granularity: 'hour',
    })
    expect(
      render('range=forever&granularity=yearly&from=yesterday').result.current.state.period,
    ).toEqual({
      preset: '30d',
      granularity: 'day',
    })
  })

  it('reads days given the wrong way round in the right order', () => {
    const { result } = render('range=custom&from=2026-10-07&to=2026-10-01')
    expect(result.current.state.period).toMatchObject({ from: '2026-10-01', to: '2026-10-07' })
    expect(result.current.state.query.start).toBeLessThan(result.current.state.query.end)
    act(() => result.current.state.setCustom('2026-09-30', '2026-09-01'))
    expect(result.current.params.get('from')).toBe('2026-09-01')
    expect(result.current.params.get('to')).toBe('2026-09-30')
  })

  it('swaps a granularity that does not fit the range', () => {
    const { result } = render('range=24h&granularity=month')
    expect(result.current.state.allowed).toEqual(['hour', 'day'])
    expect(result.current.state.query.granularity).toBe('day')
  })

  it('writes changes to the URL, replacing the history entry', () => {
    const { result, calls } = render()
    act(() => result.current.state.setPreset('90d'))
    expect(result.current.params.toString()).toBe('range=90d&granularity=week')
    act(() => result.current.state.setCustom('2026-09-01', '2026-09-30'))
    expect(result.current.params.get('range')).toBe('custom')
    expect(result.current.params.get('from')).toBe('2026-09-01')
    act(() => result.current.state.setGranularity('week'))
    expect(result.current.state.query.granularity).toBe('week')
    expect(calls.every((options) => options.replace === true)).toBe(true)
  })

  it('keeps other query parameters, and reset clears only its own', () => {
    const { result } = render('view=unit&range=7d')
    expect(result.current.state.isDefault).toBe(false)
    act(() => result.current.state.reset())
    expect(result.current.params.toString()).toBe('view=unit')
    expect(result.current.state.isDefault).toBe(true)
  })
})
