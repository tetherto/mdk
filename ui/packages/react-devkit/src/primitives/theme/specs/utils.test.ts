import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { applyTheme, getStoredTheme, getSystemTheme, setStoredTheme } from '../utils'

describe('getSystemTheme', () => {
  it('returns light when window is undefined', () => {
    const originalWindow = globalThis.window
    // @ts-expect-error - testing undefined window
    delete globalThis.window

    expect(getSystemTheme()).toBe('light')

    globalThis.window = originalWindow
  })

  it('returns dark when matchMedia prefers dark', () => {
    const matchMediaMock = vi.fn().mockImplementation((query) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
    }))
    window.matchMedia = matchMediaMock

    expect(getSystemTheme()).toBe('dark')
  })

  it('returns light when matchMedia does not prefer dark', () => {
    const matchMediaMock = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
    }))
    window.matchMedia = matchMediaMock

    expect(getSystemTheme()).toBe('light')
  })
})

describe('applyTheme', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.style.colorScheme = ''
  })

  it('applies light theme', () => {
    applyTheme('light')

    expect(document.documentElement.classList.contains('light')).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.documentElement.style.colorScheme).toBe('light')
  })

  it('applies dark theme', () => {
    applyTheme('dark')

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.classList.contains('light')).toBe(false)
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('applies system theme based on matchMedia', () => {
    const matchMediaMock = vi.fn().mockImplementation((query) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
    }))
    window.matchMedia = matchMediaMock

    applyTheme('system')

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('removes previous theme class when switching', () => {
    applyTheme('light')
    expect(document.documentElement.classList.contains('light')).toBe(true)

    applyTheme('dark')
    expect(document.documentElement.classList.contains('light')).toBe(false)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})

describe('getStoredTheme', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('returns null when no theme is stored', () => {
    expect(getStoredTheme()).toBe(null)
  })

  it('returns stored theme with default key', () => {
    localStorage.setItem('theme', 'dark')
    expect(getStoredTheme()).toBe('dark')
  })

  it('returns stored theme with custom key', () => {
    localStorage.setItem('custom-theme', 'light')
    expect(getStoredTheme('custom-theme')).toBe('light')
  })

  it('returns null when localStorage access fails', () => {
    const originalGetItem = Storage.prototype.getItem
    Storage.prototype.getItem = vi.fn().mockImplementation(() => {
      throw new Error('localStorage disabled')
    })

    expect(getStoredTheme()).toBe(null)

    Storage.prototype.getItem = originalGetItem
  })
})

describe('setStoredTheme', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('stores theme with default key', () => {
    setStoredTheme('dark')
    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('stores theme with custom key', () => {
    setStoredTheme('light', 'custom-theme')
    expect(localStorage.getItem('custom-theme')).toBe('light')
  })

  it('overwrites existing theme', () => {
    setStoredTheme('light')
    expect(localStorage.getItem('theme')).toBe('light')

    setStoredTheme('dark')
    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('handles system theme', () => {
    setStoredTheme('system')
    expect(localStorage.getItem('theme')).toBe('system')
  })

  it('silently fails when localStorage access fails', () => {
    const originalSetItem = Storage.prototype.setItem
    Storage.prototype.setItem = vi.fn().mockImplementation(() => {
      throw new Error('localStorage disabled')
    })

    expect(() => setStoredTheme('dark')).not.toThrow()

    Storage.prototype.setItem = originalSetItem
  })
})
