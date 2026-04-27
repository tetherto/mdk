import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useBeepSound } from '../use-beep-sound'

vi.mock('../assets/beep.mp3', () => ({
  default: '/mocked-beep.mp3',
}))

const mockPlay = vi.fn().mockResolvedValue(undefined)
const mockPause = vi.fn()
const mockLoad = vi.fn()
const mockRemoveAttribute = vi.fn()

describe('useBeepSound', () => {
  beforeEach(() => {
    // Only fake setInterval/clearInterval — the hook does not use setTimeout.
    // Faking setTimeout blocks happy-dom's MessageChannel delivery (React's scheduler)
    // causing "Should not already be working" errors across tests.
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    mockPlay.mockResolvedValue(undefined)
    // vitest 4 requires class syntax for constructor mocks — arrow functions
    // cannot be used with `new` and prettier would revert function() to () =>.
    vi.stubGlobal(
      'Audio',
      vi.fn().mockImplementation(
        class {
          play = mockPlay
          pause = mockPause
          load = mockLoad
          removeAttribute = mockRemoveAttribute
          volume = 0
          currentTime = 0
          src = ''
        },
      ),
    )
  })

  afterEach(() => {
    // cleanup() must run while fake timers are still active so that React's
    // act() can properly flush effects and clearInterval() clears the fake handle.
    cleanup()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('should do nothing when isAllowed is false (default)', () => {
    renderHook(() => useBeepSound())

    expect(Audio).not.toHaveBeenCalled()
  })

  it('should do nothing when isAllowed is explicitly false', () => {
    renderHook(() => useBeepSound({ isAllowed: false }))

    expect(Audio).not.toHaveBeenCalled()
  })

  it('should create Audio instance when isAllowed is true', () => {
    renderHook(() => useBeepSound({ isAllowed: true }))

    expect(Audio).toHaveBeenCalledWith('/mocked-beep.mp3')
  })

  it('should play sound on each interval tick', () => {
    renderHook(() => useBeepSound({ isAllowed: true }))

    vi.advanceTimersByTime(1000)
    expect(mockPlay).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(1000)
    expect(mockPlay).toHaveBeenCalledTimes(2)
  })

  it('should reset playback before replaying', () => {
    renderHook(() => useBeepSound({ isAllowed: true }))

    vi.advanceTimersByTime(1000)

    expect(mockPause).toHaveBeenCalled()
    expect(mockPlay).toHaveBeenCalled()
  })

  it('should clean up on unmount', () => {
    const { unmount } = renderHook(() => useBeepSound({ isAllowed: true }))

    unmount()

    expect(mockPause).toHaveBeenCalled()
    expect(mockRemoveAttribute).toHaveBeenCalledWith('src')
    expect(mockLoad).toHaveBeenCalled()
  })

  it('should clean up when isAllowed changes from true to false', () => {
    const { rerender } = renderHook(({ isAllowed }) => useBeepSound({ isAllowed }), {
      initialProps: { isAllowed: true },
    })

    expect(Audio).toHaveBeenCalledTimes(1)

    rerender({ isAllowed: false })

    expect(mockPause).toHaveBeenCalled()
    expect(mockLoad).toHaveBeenCalled()
  })

  it('should respect custom volume', () => {
    renderHook(() => useBeepSound({ isAllowed: true, volume: 0.8 }))

    const audioInstance = vi.mocked(Audio).mock.results[0]?.value
    expect(audioInstance?.volume).toBe(0.8)
  })

  it('should respect custom delayMs', () => {
    renderHook(() => useBeepSound({ isAllowed: true, delayMs: 500 }))

    vi.advanceTimersByTime(400)
    expect(mockPlay).not.toHaveBeenCalled()

    vi.advanceTimersByTime(100)
    expect(mockPlay).toHaveBeenCalledTimes(1)
  })

  it('should respect custom src', () => {
    renderHook(() => useBeepSound({ isAllowed: true, src: '/custom-sound.mp3' }))

    expect(Audio).toHaveBeenCalledWith('/custom-sound.mp3')
  })

  it('should not play after unmount', () => {
    const { unmount } = renderHook(() => useBeepSound({ isAllowed: true }))

    unmount()
    mockPlay.mockClear()

    vi.advanceTimersByTime(5000)

    expect(mockPlay).not.toHaveBeenCalled()
  })
})
