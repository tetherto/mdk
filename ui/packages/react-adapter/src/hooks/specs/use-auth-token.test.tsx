import { authStore } from '@tetherto/mdk-ui-core'
import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthToken } from '../use-auth-token'

const setLocation = (search: string, pathname = '/') => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      ...window.location,
      pathname,
      search,
      hash: '',
    },
  })
}

describe('useAuthToken', () => {
  let replaceStateSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    authStore.getState().reset()
    replaceStateSpy = vi.spyOn(window.history, 'replaceState').mockImplementation(() => {})
  })

  afterEach(() => {
    replaceStateSpy.mockRestore()
    authStore.getState().reset()
  })

  it('persists ?authToken= into authStore', () => {
    setLocation('?authToken=tok-1')
    renderHook(() => useAuthToken())
    expect(authStore.getState().token).toBe('tok-1')
  })

  it('strips the param from the URL via history.replaceState', () => {
    setLocation('?authToken=tok-1&foo=bar', '/dashboard')
    renderHook(() => useAuthToken())
    expect(replaceStateSpy).toHaveBeenCalledOnce()
    const [, , url] = replaceStateSpy.mock.calls[0]!
    expect(url).toBe('/dashboard?foo=bar')
  })

  it('does nothing when the URL has no authToken param', () => {
    setLocation('?foo=bar')
    const { result } = renderHook(() => useAuthToken())
    expect(result.current).toBeNull()
    expect(replaceStateSpy).not.toHaveBeenCalled()
  })

  it('skips work when the URL token matches the store token', () => {
    authStore.getState().setToken('same')
    setLocation('?authToken=same')
    renderHook(() => useAuthToken())
    expect(replaceStateSpy).not.toHaveBeenCalled()
  })

  it('returns the token from the store so consumers can react to it', () => {
    setLocation('?authToken=fresh')
    const { result } = renderHook(() => useAuthToken())
    expect(result.current).toBe('fresh')
  })
})
