import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useWindowSize } from '../use-windows-size'

describe('useWindowSize', () => {
  // Store original values
  const originalInnerWidth = window.innerWidth
  const originalInnerHeight = window.innerHeight

  beforeEach(() => {
    // Reset window dimensions before each test
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    })
  })

  afterEach(() => {
    // Restore original values
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: originalInnerHeight,
    })
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('returns current window dimensions on mount', () => {
      const { result } = renderHook(() => useWindowSize())

      expect(result.current.windowWidth).toBe(1024)
      expect(result.current.windowHeight).toBe(768)
    })

    it('returns object with windowWidth and windowHeight properties', () => {
      const { result } = renderHook(() => useWindowSize())

      expect(result.current).toHaveProperty('windowWidth')
      expect(result.current).toHaveProperty('windowHeight')
    })

    it('returns numbers for width and height', () => {
      const { result } = renderHook(() => useWindowSize())

      expect(typeof result.current.windowWidth).toBe('number')
      expect(typeof result.current.windowHeight).toBe('number')
    })
  })

  describe('resize handling', () => {
    it('updates dimensions on window resize', async () => {
      const { result } = renderHook(() => useWindowSize())

      expect(result.current.windowWidth).toBe(1024)
      expect(result.current.windowHeight).toBe(768)

      // Simulate resize
      act(() => {
        Object.defineProperty(window, 'innerWidth', { value: 1920, writable: true })
        Object.defineProperty(window, 'innerHeight', { value: 1080, writable: true })
        window.dispatchEvent(new Event('resize'))
      })

      await waitFor(() => {
        expect(result.current.windowWidth).toBe(1920)
        expect(result.current.windowHeight).toBe(1080)
      })
    })

    it('handles width-only changes', async () => {
      const { result } = renderHook(() => useWindowSize())

      act(() => {
        Object.defineProperty(window, 'innerWidth', { value: 800, writable: true })
        window.dispatchEvent(new Event('resize'))
      })

      await waitFor(() => {
        expect(result.current.windowWidth).toBe(800)
        expect(result.current.windowHeight).toBe(768)
      })
    })

    it('handles height-only changes', async () => {
      const { result } = renderHook(() => useWindowSize())

      act(() => {
        Object.defineProperty(window, 'innerHeight', { value: 600, writable: true })
        window.dispatchEvent(new Event('resize'))
      })

      await waitFor(() => {
        expect(result.current.windowWidth).toBe(1024)
        expect(result.current.windowHeight).toBe(600)
      })
    })

    it('handles multiple resize events', async () => {
      const { result } = renderHook(() => useWindowSize())

      // First resize
      act(() => {
        Object.defineProperty(window, 'innerWidth', { value: 1280, writable: true })
        Object.defineProperty(window, 'innerHeight', { value: 720, writable: true })
        window.dispatchEvent(new Event('resize'))
      })

      await waitFor(() => {
        expect(result.current.windowWidth).toBe(1280)
        expect(result.current.windowHeight).toBe(720)
      })

      // Second resize
      act(() => {
        Object.defineProperty(window, 'innerWidth', { value: 800, writable: true })
        Object.defineProperty(window, 'innerHeight', { value: 600, writable: true })
        window.dispatchEvent(new Event('resize'))
      })

      await waitFor(() => {
        expect(result.current.windowWidth).toBe(800)
        expect(result.current.windowHeight).toBe(600)
      })
    })
  })

  describe('event listener management', () => {
    it('adds resize event listener on mount', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

      renderHook(() => useWindowSize())

      expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    })

    it('removes resize event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

      const { unmount } = renderHook(() => useWindowSize())

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    })

    it('does not leak event listeners', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

      const { unmount } = renderHook(() => useWindowSize())

      const addCallCount = addEventListenerSpy.mock.calls.length
      unmount()
      const removeCallCount = removeEventListenerSpy.mock.calls.length

      expect(addCallCount).toBe(removeCallCount)
    })
  })

  describe('optimization', () => {
    it('does not trigger re-render when dimensions unchanged', () => {
      const { result } = renderHook(() => useWindowSize())
      const firstRender = result.current

      // Dispatch resize without changing dimensions
      act(() => {
        window.dispatchEvent(new Event('resize'))
      })

      // Same object reference = no re-render
      expect(result.current).toBe(firstRender)
    })

    it('triggers re-render only when dimensions change', () => {
      const { result } = renderHook(() => useWindowSize())
      const firstRender = result.current

      act(() => {
        Object.defineProperty(window, 'innerWidth', { value: 1920, writable: true })
        window.dispatchEvent(new Event('resize'))
      })

      // Different object reference = re-render occurred
      expect(result.current).not.toBe(firstRender)
    })
  })

  describe('edge cases', () => {
    it('handles zero dimensions', async () => {
      act(() => {
        Object.defineProperty(window, 'innerWidth', { value: 0, writable: true })
        Object.defineProperty(window, 'innerHeight', { value: 0, writable: true })
      })

      const { result } = renderHook(() => useWindowSize())

      expect(result.current.windowWidth).toBe(0)
      expect(result.current.windowHeight).toBe(0)
    })

    it('handles very large dimensions', async () => {
      act(() => {
        Object.defineProperty(window, 'innerWidth', { value: 10000, writable: true })
        Object.defineProperty(window, 'innerHeight', { value: 10000, writable: true })
      })

      const { result } = renderHook(() => useWindowSize())

      expect(result.current.windowWidth).toBe(10000)
      expect(result.current.windowHeight).toBe(10000)
    })

    it('handles rapid resize events', async () => {
      const { result } = renderHook(() => useWindowSize())

      // Simulate rapid resizes
      act(() => {
        Object.defineProperty(window, 'innerWidth', { value: 1000, writable: true })
        window.dispatchEvent(new Event('resize'))
        Object.defineProperty(window, 'innerWidth', { value: 1100, writable: true })
        window.dispatchEvent(new Event('resize'))
        Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true })
        window.dispatchEvent(new Event('resize'))
      })

      await waitFor(() => {
        expect(result.current.windowWidth).toBe(1200)
      })
    })
  })

  describe('common breakpoints', () => {
    it.each([
      { width: 320, height: 568, name: 'Mobile (iPhone SE)' },
      { width: 375, height: 667, name: 'Mobile (iPhone 8)' },
      { width: 768, height: 1024, name: 'Tablet (iPad)' },
      { width: 1024, height: 768, name: 'Laptop' },
      { width: 1920, height: 1080, name: 'Desktop (Full HD)' },
      { width: 2560, height: 1440, name: 'Desktop (2K)' },
    ])('handles $name dimensions correctly', async ({ width, height }) => {
      act(() => {
        Object.defineProperty(window, 'innerWidth', { value: width, writable: true })
        Object.defineProperty(window, 'innerHeight', { value: height, writable: true })
      })

      const { result } = renderHook(() => useWindowSize())

      expect(result.current.windowWidth).toBe(width)
      expect(result.current.windowHeight).toBe(height)
    })
  })

  describe('responsiveness', () => {
    it('correctly identifies mobile viewport', async () => {
      act(() => {
        Object.defineProperty(window, 'innerWidth', { value: 375, writable: true })
      })

      const { result } = renderHook(() => useWindowSize())

      expect(result.current.windowWidth).toBeLessThan(768)
    })

    it('correctly identifies tablet viewport', async () => {
      act(() => {
        Object.defineProperty(window, 'innerWidth', { value: 800, writable: true })
      })

      const { result } = renderHook(() => useWindowSize())

      expect(result.current.windowWidth).toBeGreaterThanOrEqual(768)
      expect(result.current.windowWidth).toBeLessThan(1024)
    })

    it('correctly identifies desktop viewport', async () => {
      act(() => {
        Object.defineProperty(window, 'innerWidth', { value: 1920, writable: true })
      })

      const { result } = renderHook(() => useWindowSize())

      expect(result.current.windowWidth).toBeGreaterThanOrEqual(1024)
    })
  })
})
