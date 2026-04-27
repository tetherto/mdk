/**
 * Theme utilities
 */

import type { Theme } from './index'

/**
 * Get the system theme preference
 */
export const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light'

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * Apply theme to document
 */
export const applyTheme = (theme: Theme): void => {
  const root = document.documentElement
  const resolvedTheme = theme === 'system' ? getSystemTheme() : theme

  root.classList.remove('light', 'dark')
  root.classList.add(resolvedTheme)
  root.style.colorScheme = resolvedTheme
}

/**
 * Get stored theme from localStorage
 */
export const getStoredTheme = (storageKey = 'theme'): Theme | null => {
  if (typeof window === 'undefined') return null

  try {
    return localStorage.getItem(storageKey) as Theme | null
  } catch {
    return null
  }
}

/**
 * Store theme in localStorage
 */
export const setStoredTheme = (theme: Theme, storageKey = 'theme'): void => {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(storageKey, theme)
  } catch {
    // Ignore localStorage errors
  }
}
