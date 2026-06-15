import { useEffect, useState } from 'react'

/**
 * Tracks whether a specific keyboard key is currently held down.
 *
 * Attaches global `keydown`/`keyup` listeners so any focused element will
 * trigger the toggle. Useful for shift-click multi-select, modifier-aware
 * shortcuts, and live previews while a key is held.
 *
 * @category utility
 */
export const useKeyDown = (keyName: string): boolean => {
  const [isKeyDown, setIsKeyDown] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === keyName) setIsKeyDown(true)
    }

    const handleKeyUp = (e: KeyboardEvent): void => {
      if (e.key === keyName) setIsKeyDown(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [keyName])

  return isKeyDown
}
