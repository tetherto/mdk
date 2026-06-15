import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useKeyDown } from '../use-key-down'

const fireKeyDown = (key: string) =>
  act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })))

const fireKeyUp = (key: string) =>
  act(() => window.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true })))

describe('useKeyDown', () => {
  describe('initial state', () => {
    it('returns false before any key event', () => {
      const { result } = renderHook(() => useKeyDown('Shift'))
      expect(result.current).toBe(false)
    })
  })

  describe('keydown', () => {
    it('returns true when the watched key is pressed', async () => {
      const { result } = renderHook(() => useKeyDown('Shift'))
      await fireKeyDown('Shift')
      expect(result.current).toBe(true)
    })

    it('stays false when a different key is pressed', async () => {
      const { result } = renderHook(() => useKeyDown('Shift'))
      await fireKeyDown('Enter')
      expect(result.current).toBe(false)
    })

    it('handles single character keys', async () => {
      const { result } = renderHook(() => useKeyDown('a'))
      await fireKeyDown('a')
      expect(result.current).toBe(true)
    })
  })

  describe('keyup', () => {
    it('returns false after the key is released', async () => {
      const { result } = renderHook(() => useKeyDown('Shift'))
      await fireKeyDown('Shift')
      await fireKeyUp('Shift')
      expect(result.current).toBe(false)
    })

    it('stays true when a different key is released', async () => {
      const { result } = renderHook(() => useKeyDown('Shift'))
      await fireKeyDown('Shift')
      await fireKeyUp('Control')
      expect(result.current).toBe(true)
    })
  })

  describe('keyName change', () => {
    it('tracks the new key after keyName prop changes', async () => {
      const { result, rerender } = renderHook(({ key }) => useKeyDown(key), {
        initialProps: { key: 'Shift' },
      })

      await fireKeyDown('Shift')
      expect(result.current).toBe(true)

      rerender({ key: 'Control' })
      expect(result.current).toBe(true)

      await fireKeyDown('Control')
      expect(result.current).toBe(true)
    })

    it('no longer responds to old key after keyName changes', async () => {
      const { result, rerender } = renderHook(({ key }) => useKeyDown(key), {
        initialProps: { key: 'Shift' },
      })

      rerender({ key: 'Control' })
      await fireKeyDown('Shift')
      expect(result.current).toBe(false)
    })
  })

  describe('event listener cleanup', () => {
    it('removes event listeners on unmount', async () => {
      const addSpy = vi.spyOn(window, 'addEventListener')
      const removeSpy = vi.spyOn(window, 'removeEventListener')

      const { unmount } = renderHook(() => useKeyDown('Shift'))
      unmount()

      expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
      expect(addSpy).toHaveBeenCalledWith('keyup', expect.any(Function))
      expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
      expect(removeSpy).toHaveBeenCalledWith('keyup', expect.any(Function))

      addSpy.mockRestore()
      removeSpy.mockRestore()
    })

    it('does not update state after unmount', async () => {
      const { result, unmount } = renderHook(() => useKeyDown('Shift'))
      unmount()
      await fireKeyDown('Shift')
      expect(result.current).toBe(false)
    })
  })
})
