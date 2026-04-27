import { useCallback, useEffect, useState } from 'react'

/**
 * Custom hook for type-safe localStorage access with cross-tab sync.
 *
 * @param key - localStorage key
 * @param defaultValue - fallback value when key is missing or invalid
 * @returns [value, setValue, removeValue]
 *
 * @example
 * ```tsx
 * const [theme, setTheme, removeTheme] = useLocalStorage('theme', 'dark')
 * setTheme('light')
 * setTheme((prev) => prev === 'dark' ? 'light' : 'dark')
 * removeTheme()
 * ```
 */
export const useLocalStorage = <T>(
  key: string,
  defaultValue: T,
): [T, (value: T | ((prev: T) => T)) => void, VoidFunction] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue
    try {
      const item = localStorage.getItem(key)
      return item ? (JSON.parse(item) as T) : defaultValue
    } catch {
      return defaultValue
    }
  })

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const nextValue = typeof value === 'function' ? (value as (prev: T) => T)(prev) : value
        try {
          localStorage.setItem(key, JSON.stringify(nextValue))
        } catch {
          // quota exceeded or similar
        }
        return nextValue
      })
    },
    [key],
  )

  const removeValue = useCallback(() => {
    try {
      localStorage.removeItem(key)
    } catch {
      // silent
    }
    setStoredValue(defaultValue)
  }, [key, defaultValue])

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key !== key) return
      try {
        setStoredValue(e.newValue ? (JSON.parse(e.newValue) as T) : defaultValue)
      } catch {
        setStoredValue(defaultValue)
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [key, defaultValue])

  return [storedValue, setValue, removeValue]
}
