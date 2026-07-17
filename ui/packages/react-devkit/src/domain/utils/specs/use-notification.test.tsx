// @vitest-environment jsdom
import { notificationStore } from '@tetherto/mdk-ui-foundation'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useNotification } from '../use-notification'

describe('useNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    notificationStore.getState().reset()
  })

  afterEach(() => {
    const container = document.getElementById('notification-service-container')
    container?.remove()
    notificationStore.getState().reset()
  })

  it('returns all notify methods', () => {
    const { result } = renderHook(() => useNotification())

    expect(result.current.notifySuccess).toBeDefined()
    expect(result.current.notifyError).toBeDefined()
    expect(result.current.notifyInfo).toBeDefined()
    expect(result.current.notifyWarning).toBeDefined()

    expect(typeof result.current.notifySuccess).toBe('function')
    expect(typeof result.current.notifyError).toBe('function')
    expect(typeof result.current.notifyInfo).toBe('function')
    expect(typeof result.current.notifyWarning).toBe('function')
  })

  it.each(['notifySuccess', 'notifyError', 'notifyInfo', 'notifyWarning'] as const)(
    '%s does not throw and increments the notification counter',
    (method) => {
      const { result } = renderHook(() => useNotification())

      expect(() => {
        act(() => {
          result.current[method]('Title', 'Description')
        })
      }).not.toThrow()

      expect(notificationStore.getState().count).toBeGreaterThan(0)
    },
  )

  it('accepts an optional description', () => {
    const { result } = renderHook(() => useNotification())

    expect(() => {
      act(() => {
        result.current.notifySuccess('Title only')
      })
    }).not.toThrow()
  })

  it('accepts an options object', () => {
    const { result } = renderHook(() => useNotification())

    expect(() => {
      act(() => {
        result.current.notifySuccess('Success', 'Description', {
          duration: 5000,
          position: 'bottom-right',
          dontClose: false,
        })
      })
    }).not.toThrow()
  })

  it('handles the dontClose option', () => {
    const { result } = renderHook(() => useNotification())

    expect(() => {
      act(() => {
        result.current.notifyError('Error', 'Critical', { dontClose: true })
      })
    }).not.toThrow()
  })

  it('handles multiple rapid calls', () => {
    const { result } = renderHook(() => useNotification())

    expect(() => {
      act(() => {
        result.current.notifySuccess('Success 1')
        result.current.notifyError('Error 1')
        result.current.notifyInfo('Info 1')
        result.current.notifyWarning('Warning 1')
      })
    }).not.toThrow()

    expect(notificationStore.getState().count).toBe(4)
  })
})
