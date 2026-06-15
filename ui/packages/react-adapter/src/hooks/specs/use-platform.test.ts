import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { detectPlatform, OS_TYPES, usePlatform } from '../use-platform'

const setUserAgent = (ua: string) => {
  Object.defineProperty(navigator, 'userAgent', {
    value: ua,
    writable: true,
    configurable: true,
  })
}

describe('detectPlatform', () => {
  afterEach(() => {
    setUserAgent('')
  })

  it('returns ios for iPhone user agent', () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)')
    expect(detectPlatform()).toBe(OS_TYPES.IOS)
  })

  it('returns ios for iPad user agent', () => {
    setUserAgent('Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)')
    expect(detectPlatform()).toBe(OS_TYPES.IOS)
  })

  it('returns ios for iPod user agent', () => {
    setUserAgent('Mozilla/5.0 (iPod touch; CPU iPhone OS 16_0 like Mac OS X)')
    expect(detectPlatform()).toBe(OS_TYPES.IOS)
  })

  it('returns android for Android user agent', () => {
    setUserAgent('Mozilla/5.0 (Linux; Android 13; Pixel 7)')
    expect(detectPlatform()).toBe(OS_TYPES.Android)
  })

  it('returns mac for macOS user agent', () => {
    setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 13_0)')
    expect(detectPlatform()).toBe(OS_TYPES.MAC)
  })

  it('returns windows for Windows user agent', () => {
    setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
    expect(detectPlatform()).toBe(OS_TYPES.Windows)
  })

  it('returns linux for Linux user agent', () => {
    setUserAgent('Mozilla/5.0 (X11; Linux x86_64)')
    expect(detectPlatform()).toBe(OS_TYPES.Linux)
  })

  it('returns unknown for unrecognised user agent', () => {
    setUserAgent('SomeUnknownBrowser/1.0')
    expect(detectPlatform()).toBe('unknown')
  })

  it('returns unknown for empty user agent', () => {
    setUserAgent('')
    expect(detectPlatform()).toBe('unknown')
  })

  it('is case-insensitive (upper case UA)', () => {
    setUserAgent('MOZILLA/5.0 (IPHONE; CPU IPHONE OS 16_0)')
    expect(detectPlatform()).toBe(OS_TYPES.IOS)
  })

  it('prioritises iOS over android when both substrings appear', () => {
    setUserAgent('iphone android')
    expect(detectPlatform()).toBe(OS_TYPES.IOS)
  })
})

describe('usePlatform', () => {
  afterEach(() => {
    setUserAgent('')
  })

  it('returns "unknown" as initial state', () => {
    setUserAgent('SomeUnknownBrowser/1.0')
    const { result } = renderHook(() => usePlatform())
    expect(result.current).toBe('unknown')
  })

  it('returns detected platform after mount', async () => {
    setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
    const { result } = renderHook(() => usePlatform())
    await vi.waitFor(() => expect(result.current).toBe(OS_TYPES.Windows))
  })

  it('returns mac for macOS UA', async () => {
    setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 13_0)')
    const { result } = renderHook(() => usePlatform())
    await vi.waitFor(() => expect(result.current).toBe(OS_TYPES.MAC))
  })

  it('does not re-run detection on re-render', async () => {
    setUserAgent('Mozilla/5.0 (Windows NT 10.0)')
    const detectSpy = vi.spyOn({ detectPlatform }, 'detectPlatform')
    const { rerender, result } = renderHook(() => usePlatform())
    await vi.waitFor(() => expect(result.current).toBe(OS_TYPES.Windows))
    rerender()
    expect(detectSpy).not.toHaveBeenCalled()
    detectSpy.mockRestore()
  })
})
