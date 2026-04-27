import { useEffect, useState } from 'react'

const DEFAULT_INTERVAL = 5000

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
