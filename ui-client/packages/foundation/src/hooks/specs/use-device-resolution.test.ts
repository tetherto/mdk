import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { BREAKPOINTS, useDeviceResolution } from '../use-device-resolution'

describe('useDeviceResolution', () => {
  const setWidth = (width: number) => {
    Object.defineProperty(window, 'innerWidth', {
      value: width,
      writable: true,
      configurable: true,
    })
  }

  beforeEach(() => setWidth(1024))
  afterEach(() => setWidth(1024))

  describe('breakpoints', () => {
    it('has correct breakpoint values', () => {
      expect(BREAKPOINTS.MOBILE_MAX).toBe(767)
      expect(BREAKPOINTS.TABLET_MAX).toBe(991)
      expect(BREAKPOINTS.DESKTOP_MIN).toBe(992)
    })
  })

  describe('device detection', () => {
    it.each([
      { width: 320, isMobile: true, isTablet: false, isDesktop: false },
      { width: 767, isMobile: true, isTablet: false, isDesktop: false },
      { width: 768, isMobile: false, isTablet: true, isDesktop: false },
      { width: 991, isMobile: false, isTablet: true, isDesktop: false },
      { width: 992, isMobile: false, isTablet: false, isDesktop: true },
      { width: 1920, isMobile: false, isTablet: false, isDesktop: true },
    ])('detects $width px correctly', ({ width, isMobile, isTablet, isDesktop }) => {
      setWidth(width)
      const { result } = renderHook(() => useDeviceResolution())

      expect(result.current.isMobile).toBe(isMobile)
      expect(result.current.isTablet).toBe(isTablet)
      expect(result.current.isDesktop).toBe(isDesktop)
      expect(result.current.width).toBe(width)
    })
  })

  describe('resize updates', () => {
    it('updates device type on resize', async () => {
      setWidth(375)
      const { result } = renderHook(() => useDeviceResolution())

      expect(result.current.isMobile).toBe(true)

      act(() => {
        setWidth(800)
        window.dispatchEvent(new Event('resize'))
      })

      await waitFor(() => {
        expect(result.current.isTablet).toBe(true)
      })
    })
  })

  describe('return value', () => {
    it('returns all required properties', () => {
      const { result } = renderHook(() => useDeviceResolution())

      expect(result.current).toEqual({
        isMobile: expect.any(Boolean),
        isTablet: expect.any(Boolean),
        isDesktop: expect.any(Boolean),
        width: expect.any(Number),
      })
    })

    it('only one device flag is true at a time', () => {
      ;[320, 768, 1920].forEach((width) => {
        setWidth(width)
        const { result } = renderHook(() => useDeviceResolution())

        const trueCount = [
          result.current.isMobile,
          result.current.isTablet,
          result.current.isDesktop,
        ].filter(Boolean).length

        expect(trueCount).toBe(1)
      })
    })
  })

  describe('memoization', () => {
    it('returns same object when width unchanged', () => {
      const { result, rerender } = renderHook(() => useDeviceResolution())
      const first = result.current

      rerender()

      expect(result.current).toBe(first)
    })

    it('returns new object when width changes', async () => {
      setWidth(375)
      const { result } = renderHook(() => useDeviceResolution())
      const first = result.current

      act(() => {
        setWidth(800)
        window.dispatchEvent(new Event('resize'))
      })

      await waitFor(() => {
        expect(result.current).not.toBe(first)
      })
    })
  })
})
