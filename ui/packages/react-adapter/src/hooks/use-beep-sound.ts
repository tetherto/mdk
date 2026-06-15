import { useEffect, useRef } from 'react'

const DEFAULTS = {
  IS_ALLOWED: false,
  VOLUME: 0.5,
  DELAY_MS: 1_000,
  TONE_DURATION_MS: 180,
  TONE_FREQUENCIES_HZ: [988, 740] as const,
  INTRA_TONE_GAP_MS: 20,
} as const

type UseBeepSoundOptions = {
  /** Whether the beep sound is allowed to play. Defaults to `false`. */
  isAllowed?: boolean
  /** Volume level from 0 to 1. Defaults to `0.5`. */
  volume?: number
  /** Delay in milliseconds between beeps. Defaults to `1000`. */
  delayMs?: number
}

type AudioContextCtor = typeof AudioContext

const getAudioContextCtor = (): AudioContextCtor | undefined => {
  if (typeof window === 'undefined') {
    return undefined
  }
  const browserWindow = window as unknown as {
    AudioContext?: AudioContextCtor
    webkitAudioContext?: AudioContextCtor
  }
  return browserWindow.AudioContext ?? browserWindow.webkitAudioContext
}

/**
 * Plays a repeating beep sound at a configurable interval.
 *
 * Useful for critical alerts (e.g., overheating containers) where an audible
 * notification is needed to draw the operator's attention.
 *
 * The alarm is synthesised at runtime via the Web Audio API as a pair of
 * alternating tones (high -> low) — no audio asset is bundled or fetched.
 *
 * @example
 * ```tsx
 * import { useBeepSound } from './'
 *
 * // Basic usage — beep when temperature is critical
 * useBeepSound({ isAllowed: isCriticalTemp })
 *
 * // Custom interval and volume
 * useBeepSound({ isAllowed: hasAlert, delayMs: 500, volume: 0.8 })
 * ```
 *
 * @category utility
 */
export const useBeepSound = ({
  isAllowed = DEFAULTS.IS_ALLOWED,
  volume = DEFAULTS.VOLUME,
  delayMs = DEFAULTS.DELAY_MS,
}: UseBeepSoundOptions = {}): void => {
  const audioContextRef = useRef<AudioContext | null>(null)
  const ivalHandle = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  useEffect(() => {
    const destroyAudio = (): void => {
      const ctx = audioContextRef.current
      if (!ctx) {
        return
      }
      try {
        const result = ctx.close() as Promise<void> | undefined
        result?.catch?.(() => {})
      } catch {
        // ignore close() failures while tearing down
      }
      audioContextRef.current = null
    }

    const disposeIvalHandle = (): void => {
      if (ivalHandle.current) {
        clearInterval(ivalHandle.current)
        ivalHandle.current = undefined
      }
    }

    const scheduleTone = (
      ctx: AudioContext,
      frequencyHz: number,
      startSec: number,
      durationSec: number,
    ): void => {
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()

      oscillator.type = 'triangle'
      oscillator.frequency.value = frequencyHz
      oscillator.connect(gain)
      gain.connect(ctx.destination)

      gain.gain.setValueAtTime(0, startSec)
      gain.gain.linearRampToValueAtTime(volume, startSec + 0.01)
      gain.gain.setValueAtTime(volume, startSec + durationSec - 0.02)
      gain.gain.linearRampToValueAtTime(0, startSec + durationSec)

      oscillator.start(startSec)
      oscillator.stop(startSec + durationSec)
    }

    const playSynthesisedBeep = (): void => {
      const ctx = audioContextRef.current
      if (!ctx) {
        return
      }

      const toneSec = DEFAULTS.TONE_DURATION_MS / 1_000
      const gapSec = DEFAULTS.INTRA_TONE_GAP_MS / 1_000
      const startSec = ctx.currentTime

      DEFAULTS.TONE_FREQUENCIES_HZ.forEach((freq, index) => {
        scheduleTone(ctx, freq, startSec + index * (toneSec + gapSec), toneSec)
      })
    }

    disposeIvalHandle()
    destroyAudio()

    if (!isAllowed) {
      return () => {
        disposeIvalHandle()
        destroyAudio()
      }
    }

    const AudioContextConstructor = getAudioContextCtor()
    if (!AudioContextConstructor) {
      return () => {
        disposeIvalHandle()
        destroyAudio()
      }
    }

    audioContextRef.current = new AudioContextConstructor()

    ivalHandle.current = setInterval(() => {
      playSynthesisedBeep()
    }, delayMs)

    return () => {
      disposeIvalHandle()
      destroyAudio()
    }
  }, [isAllowed, volume, delayMs])
}

export type { UseBeepSoundOptions }
