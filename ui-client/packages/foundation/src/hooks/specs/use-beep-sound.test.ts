import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useBeepSound } from '../use-beep-sound'

const mockPlay = vi.fn().mockResolvedValue(undefined)
const mockPause = vi.fn()
const mockLoad = vi.fn()
const mockRemoveAttribute = vi.fn()

const mockOscStart = vi.fn()
const mockOscStop = vi.fn()
const mockOscConnect = vi.fn()
const mockGainConnect = vi.fn()
const mockSetValueAtTime = vi.fn()
const mockLinearRamp = vi.fn()
// Synchronous thenable so React's act() doesn't see a pending microtask under fake timers.
const mockClose = vi.fn().mockReturnValue({ catch: () => undefined })

const makeAudioContext = (): {
  ctx: AudioContext
  createOscillatorMock: ReturnType<typeof vi.fn>
  createGainMock: ReturnType<typeof vi.fn>
} => {
  const oscillator = {
    type: 'sine',
    frequency: { value: 0 },
    connect: mockOscConnect,
    start: mockOscStart,
    stop: mockOscStop,
  }
  const gain = {
    gain: {
      setValueAtTime: mockSetValueAtTime,
      linearRampToValueAtTime: mockLinearRamp,
    },
    connect: mockGainConnect,
  }
  const createOscillatorMock = vi.fn().mockReturnValue(oscillator)
  const createGainMock = vi.fn().mockReturnValue(gain)
  const ctx = {
    currentTime: 0,
    destination: {},
    createOscillator: createOscillatorMock,
    createGain: createGainMock,
    close: mockClose,
  } as unknown as AudioContext

  return { ctx, createOscillatorMock, createGainMock }
}

describe('useBeepSound', () => {
  let createOscillatorMock: ReturnType<typeof vi.fn>
  let AudioContextMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // Only fake setInterval/clearInterval — the hook does not use setTimeout.
    // Faking setTimeout blocks happy-dom's MessageChannel delivery (React's scheduler)
    // causing "Should not already be working" errors across tests.
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    // vitest 4 auto-resets mocks between tests (mockReset/clearMocks: true in
    // vitest.config.js), so re-apply implementations every beforeEach.
    mockPlay.mockResolvedValue(undefined)
    mockClose.mockReturnValue({ catch: () => undefined })

    const factory = makeAudioContext()
    createOscillatorMock = factory.createOscillatorMock

    AudioContextMock = vi.fn().mockImplementation(
      class {
        currentTime = 0
        destination = factory.ctx.destination
        createOscillator = factory.ctx.createOscillator
        createGain = factory.ctx.createGain
        close = factory.ctx.close
      },
    )
    vi.stubGlobal('AudioContext', AudioContextMock)

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

    expect(AudioContextMock).not.toHaveBeenCalled()
    expect(Audio).not.toHaveBeenCalled()
  })

  it('should do nothing when isAllowed is explicitly false', () => {
    renderHook(() => useBeepSound({ isAllowed: false }))

    expect(AudioContextMock).not.toHaveBeenCalled()
    expect(Audio).not.toHaveBeenCalled()
  })

  it('should create an AudioContext (synth path) when isAllowed is true and no src is provided', () => {
    renderHook(() => useBeepSound({ isAllowed: true }))

    expect(AudioContextMock).toHaveBeenCalledTimes(1)
    expect(Audio).not.toHaveBeenCalled()
  })

  it('should create an Audio element when src is provided', () => {
    renderHook(() => useBeepSound({ isAllowed: true, src: '/custom-sound.mp3' }))

    expect(Audio).toHaveBeenCalledWith('/custom-sound.mp3')
    expect(AudioContextMock).not.toHaveBeenCalled()
  })

  it('should play a two-tone alarm pulse on each interval tick', () => {
    renderHook(() => useBeepSound({ isAllowed: true }))

    // Each pulse schedules 2 oscillators (high tone + low tone).
    vi.advanceTimersByTime(1000)
    expect(createOscillatorMock).toHaveBeenCalledTimes(2)
    expect(mockOscStart).toHaveBeenCalledTimes(2)

    vi.advanceTimersByTime(1000)
    expect(createOscillatorMock).toHaveBeenCalledTimes(4)
    expect(mockOscStart).toHaveBeenCalledTimes(4)
  })

  it('should play the audio file on each interval tick when src is provided', () => {
    renderHook(() => useBeepSound({ isAllowed: true, src: '/custom-sound.mp3' }))

    vi.advanceTimersByTime(1000)
    expect(mockPlay).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(1000)
    expect(mockPlay).toHaveBeenCalledTimes(2)
  })

  it('should reset playback before replaying (src path)', () => {
    renderHook(() => useBeepSound({ isAllowed: true, src: '/custom-sound.mp3' }))

    vi.advanceTimersByTime(1000)

    expect(mockPause).toHaveBeenCalled()
    expect(mockPlay).toHaveBeenCalled()
  })

  it('should clean up synth path on unmount', () => {
    const { unmount } = renderHook(() => useBeepSound({ isAllowed: true }))

    unmount()

    expect(mockClose).toHaveBeenCalled()
  })

  it('should clean up file-playback path on unmount', () => {
    const { unmount } = renderHook(() => useBeepSound({ isAllowed: true, src: '/custom-sound.mp3' }))

    unmount()

    expect(mockPause).toHaveBeenCalled()
    expect(mockRemoveAttribute).toHaveBeenCalledWith('src')
    expect(mockLoad).toHaveBeenCalled()
  })

  it('should clean up when isAllowed changes from true to false', () => {
    const { rerender } = renderHook(({ isAllowed }) => useBeepSound({ isAllowed }), {
      initialProps: { isAllowed: true },
    })

    expect(AudioContextMock).toHaveBeenCalledTimes(1)

    rerender({ isAllowed: false })

    expect(mockClose).toHaveBeenCalled()
  })

  it('should respect custom volume on the synth gain envelope', () => {
    renderHook(() => useBeepSound({ isAllowed: true, volume: 0.8 }))

    vi.advanceTimersByTime(1000)

    // The peak of the gain envelope ramps to `volume`.
    expect(mockLinearRamp).toHaveBeenCalledWith(0.8, expect.any(Number))
  })

  it('should respect custom volume on the audio element when src is provided', () => {
    renderHook(() => useBeepSound({ isAllowed: true, volume: 0.8, src: '/custom-sound.mp3' }))

    const audioInstance = vi.mocked(Audio).mock.results[0]?.value
    expect(audioInstance?.volume).toBe(0.8)
  })

  it('should respect custom delayMs', () => {
    renderHook(() => useBeepSound({ isAllowed: true, delayMs: 500 }))

    vi.advanceTimersByTime(400)
    expect(createOscillatorMock).not.toHaveBeenCalled()

    // First pulse fires at 500ms; each pulse schedules 2 oscillators.
    vi.advanceTimersByTime(100)
    expect(createOscillatorMock).toHaveBeenCalledTimes(2)
  })

  it('should not play after unmount', () => {
    const { unmount } = renderHook(() => useBeepSound({ isAllowed: true }))

    unmount()
    createOscillatorMock.mockClear()

    vi.advanceTimersByTime(5000)

    expect(createOscillatorMock).not.toHaveBeenCalled()
  })
})
