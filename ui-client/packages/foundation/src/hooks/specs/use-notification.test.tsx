import { configureStore } from '@reduxjs/toolkit'
import { act, renderHook } from '@testing-library/react'
import * as React from 'react'
import { Provider } from 'react-redux'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { notificationSlice } from '../../state/slices/notification-slice'
import { useNotification } from '../use-notification'

const createTestStore = () =>
  configureStore({
    reducer: {
      notification: notificationSlice.reducer,
    },
  })

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const store = createTestStore()
  return <Provider store={store}>{children}</Provider>
}

describe('useNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    const container = document.getElementById('toast-notification-container')
    container?.remove()
  })

  it('should return all notification methods', () => {
    const { result } = renderHook(() => useNotification(), { wrapper })

    expect(result.current.notifySuccess).toBeDefined()
    expect(result.current.notifyError).toBeDefined()
    expect(result.current.notifyInfo).toBeDefined()
    expect(result.current.notifyWarning).toBeDefined()

    expect(typeof result.current.notifySuccess).toBe('function')
    expect(typeof result.current.notifyError).toBe('function')
    expect(typeof result.current.notifyInfo).toBe('function')
    expect(typeof result.current.notifyWarning).toBe('function')
  })

  it('should call notifySuccess without throwing', () => {
    const { result } = renderHook(() => useNotification(), { wrapper })

    expect(() => {
      act(() => {
        result.current.notifySuccess('Success', 'Description')
      })
    }).not.toThrow()
  })

  it('should call notifyError without throwing', () => {
    const { result } = renderHook(() => useNotification(), { wrapper })

    expect(() => {
      act(() => {
        result.current.notifyError('Error', 'Description')
      })
    }).not.toThrow()
  })

  it('should call notifyInfo without throwing', () => {
    const { result } = renderHook(() => useNotification(), { wrapper })

    expect(() => {
      act(() => {
        result.current.notifyInfo('Info', 'Description')
      })
    }).not.toThrow()
  })

  it('should call notifyWarning without throwing', () => {
    const { result } = renderHook(() => useNotification(), { wrapper })

    expect(() => {
      act(() => {
        result.current.notifyWarning('Warning', 'Description')
      })
    }).not.toThrow()
  })

  it('should accept optional description', () => {
    const { result } = renderHook(() => useNotification(), { wrapper })

    expect(() => {
      act(() => {
        result.current.notifySuccess('Title only')
      })
    }).not.toThrow()
  })

  it('should accept options object', () => {
    const { result } = renderHook(() => useNotification(), { wrapper })

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

  it('should handle dontClose option', () => {
    const { result } = renderHook(() => useNotification(), { wrapper })

    expect(() => {
      act(() => {
        result.current.notifyError('Error', 'Critical', { dontClose: true })
      })
    }).not.toThrow()
  })

  it('should dispatch Redux increment action', () => {
    const store = createTestStore()
    const dispatchSpy = vi.spyOn(store, 'dispatch')

    const { result } = renderHook(() => useNotification(), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    })

    act(() => {
      result.current.notifySuccess('Success')
    })

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'notifications/increment',
      }),
    )
  })

  it('should handle multiple rapid calls', () => {
    const { result } = renderHook(() => useNotification(), { wrapper })

    expect(() => {
      act(() => {
        result.current.notifySuccess('Success 1')
        result.current.notifyError('Error 1')
        result.current.notifyInfo('Info 1')
        result.current.notifyWarning('Warning 1')
      })
    }).not.toThrow()
  })

  it('should throw when used without Redux provider', () => {
    expect(() => {
      renderHook(() => useNotification())
    }).toThrow()
  })
})
