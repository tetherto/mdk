import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useEbitda } from '../use-ebitda'

describe('useEbitda', () => {
  it('defaults isLoading to false and errors to []', () => {
    const { result } = renderHook(() => useEbitda())
    expect(result.current.isLoading).toBe(false)
    expect(result.current.errors).toEqual([])
  })

  it('propagates an explicit isLoading flag', () => {
    const { result } = renderHook(() => useEbitda({ isLoading: true }))
    expect(result.current.isLoading).toBe(true)
  })

  it('forwards fetchErrors as the errors field', () => {
    const { result } = renderHook(() => useEbitda({ fetchErrors: ['timeout'] }))
    expect(result.current.errors).toEqual(['timeout'])
  })

  it('exposes a queryParams object derived from the active date range', () => {
    const { result } = renderHook(() => useEbitda())
    expect(result.current.queryParams).toBeDefined()
    expect(typeof result.current.queryParams).toBe('object')
  })

  it('returns a view model even when no ebitda data is supplied', () => {
    const { result } = renderHook(() => useEbitda())
    expect(result.current).toBeDefined()
    expect(result.current.dateRange).toBeDefined()
  })
})
