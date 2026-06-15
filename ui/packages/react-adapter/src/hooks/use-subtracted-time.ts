import { useEffect, useState } from 'react'

const DEFAULT_INTERVAL = 5000

/**
 * Returns `Date.now() - diff`, refreshing on a fixed interval (default 5s).
 *
 * Handy for rendering "synced N seconds ago" labels or any clock-offset
 * value that needs to tick without forcing the whole tree to re-render
 * every frame.
 *
 * @category utility
 */
export const useSubtractedTime = (diff: number, interval = DEFAULT_INTERVAL): number => {
  const [time, setTime] = useState(Date.now() - diff)

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTime(Date.now() - diff)
    }, interval)

    return () => clearInterval(intervalId)
  }, [diff, interval])

  return time
}
