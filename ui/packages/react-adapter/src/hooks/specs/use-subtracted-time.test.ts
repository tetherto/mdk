import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSubtractedTime } from '../use-subtracted-time'

const FROZEN_NOW = 1_700_000_000_000

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(FROZEN_NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useSubtractedTime', () => {
  describe('initial value', () => {
    it('returns Date.now() minus diff on first render', () => {
      const { result } = renderHook(() => useSubtractedTime(5000))
      expect(result.current).toBe(FROZEN_NOW - 5000)
    })

    it('returns Date.now() minus zero when diff is 0', () => {
      const { result } = renderHook(() => useSubtractedTime(0))
      expect(result.current).toBe(FROZEN_NOW)
    })

    it('handles negative diff (future time)', () => {
      const { result } = renderHook(() => useSubtractedTime(-3000))
      expect(result.current).toBe(FROZEN_NOW + 3000)
    })
  })

  describe('cleanup', () => {
    it('clears the interval on unmount', () => {
      const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')
      const { unmount } = renderHook(() => useSubtractedTime(1000))

      unmount()

      expect(clearIntervalSpy).toHaveBeenCalledOnce()
    })

    it('does not update after unmount', () => {
      const { result, unmount } = renderHook(() => useSubtractedTime(1000))
      const valueBeforeUnmount = result.current

      unmount()

      vi.setSystemTime(FROZEN_NOW + 5000)
      act(() => {
        vi.advanceTimersByTime(5000)
      })

      expect(result.current).toBe(valueBeforeUnmount)
    })
  })

  describe('dependency changes', () => {
    it('clears the old interval when diff changes', () => {
      const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')

      const { rerender } = renderHook(({ diff }) => useSubtractedTime(diff), {
        initialProps: { diff: 1000 },
      })

      rerender({ diff: 2000 })

      expect(clearIntervalSpy).toHaveBeenCalledOnce()
    })
  })
})
