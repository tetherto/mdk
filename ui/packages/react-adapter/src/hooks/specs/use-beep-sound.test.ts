import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useBeepSound } from '../use-beep-sound'

const mockOscStart = vi.fn()
const mockOscStop = vi.fn()
const mockOscConnect = vi.fn()
const mockGainConnect = vi.fn()
const mockSetValueAtTime = vi.fn()
const mockLinearRamp = vi.fn()
const mockClose = vi.fn().mockReturnValue({ catch: () => undefined })

const makeAudioContextFactory = (): {
  createOscillatorMock: ReturnType<typeof vi.fn>
  createGainMock: ReturnType<typeof vi.fn>
  destination: object
  close: typeof mockClose
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

  return {
    createOscillatorMock: vi.fn().mockReturnValue(oscillator),
    createGainMock: vi.fn().mockReturnValue(gain),
    destination: {},
    close: mockClose,
  }
}

describe('useBeepSound', () => {
  let createOscillatorMock: ReturnType<typeof vi.fn>
  let audioContextCtorSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    vi.clearAllMocks()
    mockClose.mockReturnValue({ catch: () => undefined })

    const factory = makeAudioContextFactory()
    createOscillatorMock = factory.createOscillatorMock
    audioContextCtorSpy = vi.fn()

    class FakeAudioContext {
      constructor() {
        audioContextCtorSpy()
      }

      currentTime = 0
      destination = factory.destination
      createOscillator = factory.createOscillatorMock
      createGain = factory.createGainMock
      close = factory.close
    }

    vi.stubGlobal('AudioContext', FakeAudioContext)
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('should do nothing when isAllowed is false (default)', () => {
    renderHook(() => useBeepSound())

    expect(audioContextCtorSpy).not.toHaveBeenCalled()
  })

  it('should do nothing when isAllowed is explicitly false', () => {
    renderHook(() => useBeepSound({ isAllowed: false }))

    expect(audioContextCtorSpy).not.toHaveBeenCalled()
  })

  it('should create AudioContext when isAllowed is true', () => {
    renderHook(() => useBeepSound({ isAllowed: true }))

    expect(audioContextCtorSpy).toHaveBeenCalledTimes(1)
  })

  it('should schedule a two-tone alarm pulse on each interval tick', () => {
    renderHook(() => useBeepSound({ isAllowed: true, delayMs: 1000 }))

    vi.advanceTimersByTime(1000)
    expect(createOscillatorMock).toHaveBeenCalledTimes(2)
    expect(mockOscStart).toHaveBeenCalledTimes(2)
    expect(mockOscStop).toHaveBeenCalledTimes(2)

    vi.advanceTimersByTime(1000)
    expect(createOscillatorMock).toHaveBeenCalledTimes(4)
    expect(mockOscStart).toHaveBeenCalledTimes(4)
    expect(mockOscStop).toHaveBeenCalledTimes(4)
  })

  it('should respect custom volume on the synth gain envelope', () => {
    renderHook(() => useBeepSound({ isAllowed: true, volume: 0.8 }))

    vi.advanceTimersByTime(1000)

    expect(mockLinearRamp).toHaveBeenCalledWith(0.8, expect.any(Number))
  })

  it('should clean up on unmount', () => {
    const { unmount } = renderHook(() => useBeepSound({ isAllowed: true }))

    unmount()

    expect(mockClose).toHaveBeenCalled()
  })

  it('should clean up when isAllowed changes from true to false', () => {
    const { rerender } = renderHook(({ isAllowed }) => useBeepSound({ isAllowed }), {
      initialProps: { isAllowed: true },
    })

    expect(audioContextCtorSpy).toHaveBeenCalledTimes(1)

    rerender({ isAllowed: false })

    expect(mockClose).toHaveBeenCalled()
  })

  it('should respect custom delayMs', () => {
    renderHook(() => useBeepSound({ isAllowed: true, delayMs: 500 }))

    vi.advanceTimersByTime(400)
    expect(createOscillatorMock).not.toHaveBeenCalled()

    vi.advanceTimersByTime(100)
    expect(createOscillatorMock).toHaveBeenCalledTimes(2)
  })

  it('should not schedule new tones after unmount', () => {
    const { unmount } = renderHook(() => useBeepSound({ isAllowed: true }))

    unmount()
    createOscillatorMock.mockClear()

    vi.advanceTimersByTime(5000)

    expect(createOscillatorMock).not.toHaveBeenCalled()
  })
})
