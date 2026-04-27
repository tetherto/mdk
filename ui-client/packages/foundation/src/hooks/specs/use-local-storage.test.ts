import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useLocalStorage } from '../use-local-storage'

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns default value when localStorage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('key', 'default'))
    expect(result.current[0]).toBe('default')
  })

  it('returns stored value when key exists', () => {
    localStorage.setItem('key', JSON.stringify('stored'))
    const { result } = renderHook(() => useLocalStorage('key', 'default'))
    expect(result.current[0]).toBe('stored')
  })

  it('returns stored object value', () => {
    const obj = { a: 1, b: true }
    localStorage.setItem('obj', JSON.stringify(obj))
    const { result } = renderHook(() => useLocalStorage('obj', {}))
    expect(result.current[0]).toEqual(obj)
  })

  it('persists value on set', () => {
    const { result } = renderHook(() => useLocalStorage('key', 'default'))

    act(() => {
      result.current[1]('updated')
    })

    expect(result.current[0]).toBe('updated')
    expect(JSON.parse(localStorage.getItem('key')!)).toBe('updated')
  })

  it('supports updater function', () => {
    const { result } = renderHook(() => useLocalStorage('count', 0))

    act(() => {
      result.current[1]((prev) => prev + 1)
    })

    expect(result.current[0]).toBe(1)
    expect(JSON.parse(localStorage.getItem('count')!)).toBe(1)
  })

  it('handles invalid JSON gracefully', () => {
    localStorage.setItem('bad', 'not-json')
    const { result } = renderHook(() => useLocalStorage('bad', 'fallback'))
    expect(result.current[0]).toBe('fallback')
  })

  it('removes key and resets to default', () => {
    localStorage.setItem('key', JSON.stringify('stored'))
    const { result } = renderHook(() => useLocalStorage('key', 'default'))

    expect(result.current[0]).toBe('stored')

    act(() => {
      result.current[2]()
    })

    expect(result.current[0]).toBe('default')
    expect(localStorage.getItem('key')).toBeNull()
  })

  it('syncs across tabs via StorageEvent', () => {
    const { result } = renderHook(() => useLocalStorage('key', 'default'))

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'key',
          newValue: JSON.stringify('from-other-tab'),
        }),
      )
    })

    expect(result.current[0]).toBe('from-other-tab')
  })

  it('ignores StorageEvent for different keys', () => {
    const { result } = renderHook(() => useLocalStorage('key', 'default'))

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'other-key',
          newValue: JSON.stringify('nope'),
        }),
      )
    })

    expect(result.current[0]).toBe('default')
  })

  it('resets to default on StorageEvent with null newValue', () => {
    localStorage.setItem('key', JSON.stringify('stored'))
    const { result } = renderHook(() => useLocalStorage('key', 'default'))

    expect(result.current[0]).toBe('stored')

    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'key', newValue: null }))
    })

    expect(result.current[0]).toBe('default')
  })

  it('handles localStorage setItem errors', () => {
    const { result } = renderHook(() => useLocalStorage('key', 'default'))

    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })

    act(() => {
      result.current[1]('value')
    })

    expect(result.current[0]).toBe('value')
    spy.mockRestore()
  })

  it('handles localStorage getItem errors on init', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })

    const { result } = renderHook(() => useLocalStorage('key', 'safe-default'))
    expect(result.current[0]).toBe('safe-default')

    spy.mockRestore()
  })
})
