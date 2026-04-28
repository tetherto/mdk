import { useEffect, useRef } from 'react'

import beepMp3 from './assets/beep.mp3'

const DEFAULTS = {
  IS_ALLOWED: false,
  VOLUME: 0.5,
  DELAY_MS: 1_000,
} as const

type UseBeepSoundOptions = {
  /** Whether the beep sound is allowed to play. Defaults to `false`. */
  isAllowed?: boolean
  /** Volume level from 0 to 1. Defaults to `0.5`. */
  volume?: number
  /** Delay in milliseconds between beeps. Defaults to `1000`. */
  delayMs?: number
  /** Custom sound source URL. Defaults to the bundled beep.mp3. */
  src?: string
}

/**
 * Plays a repeating beep sound at a configurable interval.
 *
 * Useful for critical alerts (e.g., overheating containers) where an audible
 * notification is needed to draw the operator's attention.
 *
 * @example
 * ```tsx
 * import { useBeepSound } from '@tetherto/mdk-foundation-ui/hooks'
 *
 * // Basic usage — beep when temperature is critical
 * useBeepSound({ isAllowed: isCriticalTemp })
 *
 * // Custom interval and volume
 * useBeepSound({ isAllowed: hasAlert, delayMs: 500, volume: 0.8 })
 *
 * // Custom sound source
 * useBeepSound({ isAllowed: true, src: '/sounds/alarm.mp3' })
 * ```
 */
export const useBeepSound = ({
  isAllowed = DEFAULTS.IS_ALLOWED,
  volume = DEFAULTS.VOLUME,
  delayMs = DEFAULTS.DELAY_MS,
  src = beepMp3,
}: UseBeepSoundOptions = {}): void => {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const ivalHandle = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  useEffect(() => {
    const destroyAudio = (): void => {
      const audio = audioRef.current

      if (!audio) {
        return
      }

      audio.pause()
      audio.currentTime = 0
      audio.removeAttribute('src')
      audio.load()

      audioRef.current = null
    }

    const disposeIvalHandle = (): void => {
      if (ivalHandle.current) {
        clearInterval(ivalHandle.current)
        ivalHandle.current = undefined
      }
    }

    disposeIvalHandle()
    destroyAudio()

    if (isAllowed) {
      const audio = new Audio(src)
      audio.volume = volume
      audioRef.current = audio

      ivalHandle.current = setInterval(() => {
        const instance = audioRef.current

        if (!instance) {
          return
        }

        instance.pause()
        instance.currentTime = 0
        instance.play().catch(() => {})
      }, delayMs)
    }

    return () => {
      disposeIvalHandle()
      destroyAudio()
    }
  }, [isAllowed, volume, delayMs, src])
}

export type { UseBeepSoundOptions }
