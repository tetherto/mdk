import { useEffect, useRef } from 'react'

const DEFAULTS = {
  IS_ALLOWED: false,
  VOLUME: 0.5,
  DELAY_MS: 1_000,
  TONE_DURATION_MS: 180,
  /**
   * Two-tone alarm pattern (high → low), à la European emergency vehicle.
   * Reads as urgent at any volume and is unambiguously "alarm" rather than
   * a UI tick.
   */
  TONE_FREQUENCIES_HZ: [988, 740] as const,
  /** Gap between the two tones inside a single alarm pulse. */
  INTRA_TONE_GAP_MS: 20,
} as const

type UseBeepSoundOptions = {
  /** Whether the beep sound is allowed to play. Defaults to `false`. */
  isAllowed?: boolean
  /** Volume level from 0 to 1. Defaults to `0.5`. */
  volume?: number
  /** Delay in milliseconds between beeps. Defaults to `1000`. */
  delayMs?: number
  /**
   * Optional audio source URL. When provided, an HTMLAudioElement plays this
   * file on each tick. When omitted, the hook synthesises a short sine-wave
   * beep via the Web Audio API — no asset is bundled.
   */
  src?: string
}

type AudioContextCtor = typeof AudioContext

/** Resolve the Web Audio constructor across modern browsers and legacy WebKit. */
const getAudioContextCtor = (): AudioContextCtor | undefined => {
  if (typeof window === 'undefined') return undefined
  const w = window as unknown as {
    AudioContext?: AudioContextCtor
    webkitAudioContext?: AudioContextCtor
  }
  return w.AudioContext ?? w.webkitAudioContext
}

/**
 * Plays a repeating two-tone alarm at a configurable interval.
 *
 * Useful for critical alerts (e.g., overheating containers) where an audible
 * notification is needed to draw the operator's attention.
 *
 * By default the alarm is synthesised at runtime via the Web Audio API as a
 * pair of alternating tones (high → low) — no asset ships with the package.
 * Pass `src` to play a custom file URL instead.
 *
 * @example
 * ```tsx
 * import { useBeepSound } from '@tetherto/mdk-foundation-ui/hooks'
 *
 * // Synthesised beep (default)
 * useBeepSound({ isAllowed: isCriticalTemp })
 *
 * // Custom interval and volume
 * useBeepSound({ isAllowed: hasAlert, delayMs: 500, volume: 0.8 })
 *
 * // Use an external sound file
 * useBeepSound({ isAllowed: true, src: '/sounds/alarm.mp3' })
 * ```
 */
export const useBeepSound = ({
  isAllowed = DEFAULTS.IS_ALLOWED,
  volume = DEFAULTS.VOLUME,
  delayMs = DEFAULTS.DELAY_MS,
  src,
}: UseBeepSoundOptions = {}): void => {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const ivalHandle = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  useEffect(() => {
    const destroyAudio = (): void => {
      const audio = audioRef.current
      if (audio) {
        audio.pause()
        audio.currentTime = 0
        audio.removeAttribute('src')
        audio.load()
        audioRef.current = null
      }

      const ctx = audioContextRef.current
      if (ctx) {
        try {
          // close() returns a Promise in browsers, but be defensive for
          // environments (and test mocks) that may return undefined.
          const result = ctx.close() as Promise<void> | undefined
          result?.catch?.(() => {})
        }
        catch {
          // ignore close() errors — we're tearing down anyway
        }
        audioContextRef.current = null
      }
    }

    const disposeIvalHandle = (): void => {
      if (ivalHandle.current) {
        clearInterval(ivalHandle.current)
        ivalHandle.current = undefined
      }
    }

    /**
     * Schedule one tone (oscillator + gain envelope) on the shared context.
     * Uses a triangle wave for a warmer "alarm" timbre than a pure sine
     * without the harshness of a raw square wave.
     */
    const scheduleTone = (ctx: AudioContext, frequencyHz: number, startSec: number, durationSec: number): void => {
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()

      oscillator.type = 'triangle'
      oscillator.frequency.value = frequencyHz
      oscillator.connect(gain)
      gain.connect(ctx.destination)

      // Quick attack/release envelope to avoid clicks at start/end of the tone.
      gain.gain.setValueAtTime(0, startSec)
      gain.gain.linearRampToValueAtTime(volume, startSec + 0.01)
      gain.gain.setValueAtTime(volume, startSec + durationSec - 0.02)
      gain.gain.linearRampToValueAtTime(0, startSec + durationSec)

      oscillator.start(startSec)
      oscillator.stop(startSec + durationSec)
    }

    /** Synthesise one alarm pulse: two alternating tones (high → low). */
    const playSynthesisedBeep = (): void => {
      const ctx = audioContextRef.current
      if (!ctx) return

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

    if (src) {
      const audio = new Audio(src)
      audio.volume = volume
      audioRef.current = audio

      ivalHandle.current = setInterval(() => {
        const instance = audioRef.current
        if (!instance) return

        instance.pause()
        instance.currentTime = 0
        instance.play().catch(() => {})
      }, delayMs)
    }
    else {
      const Ctor = getAudioContextCtor()
      if (!Ctor) {
        return () => {
          disposeIvalHandle()
          destroyAudio()
        }
      }

      audioContextRef.current = new Ctor()

      ivalHandle.current = setInterval(() => {
        playSynthesisedBeep()
      }, delayMs)
    }

    return () => {
      disposeIvalHandle()
      destroyAudio()
    }
  }, [isAllowed, volume, delayMs, src])
}

export type { UseBeepSoundOptions }
