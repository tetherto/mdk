import { actionsStore, authStore, devicesStore, notificationStore } from '@tetherto/mdk-ui-foundation'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useActions, useAuth, useDevices, useNotifications, useTimezone } from './store-hooks'

describe('store hooks', () => {
  it('useAuth re-renders when the underlying store updates', () => {
    authStore.getState().reset()
    const { result } = renderHook(() => useAuth())
    expect(result.current.token).toBeNull()
    act(() => {
      result.current.setToken('abc')
    })
    expect(result.current.token).toBe('abc')
    act(() => {
      result.current.reset()
    })
  })

  it('useDevices reflects mutations', () => {
    devicesStore.getState().setResetSelections()
    const { result } = renderHook(() => useDevices())
    act(() => {
      result.current.setSelectDevice({ id: 'x' })
    })
    expect(result.current.selectedDevices.map((d) => d.id)).toContain('x')
    act(() => {
      result.current.setResetSelections()
    })
  })

  it('useNotifications reflects increments', () => {
    notificationStore.getState().reset()
    const { result } = renderHook(() => useNotifications())
    act(() => {
      result.current.increment()
    })
    expect(result.current.count).toBe(1)
    act(() => {
      result.current.reset()
    })
  })

  it('useTimezone reflects updates', () => {
    const { result } = renderHook(() => useTimezone())
    act(() => {
      result.current.setTimezone('UTC')
    })
    expect(result.current.timezone).toBe('UTC')
  })

  it('useActions reflects pending submissions', () => {
    actionsStore.getState().clearAllPendingSubmissions()
    const { result } = renderHook(() => useActions())
    act(() => {
      result.current.setAddPendingSubmissionAction({ action: 'restart' })
    })
    expect(result.current.pendingSubmissions[0]?.action).toBe('restart')
    act(() => {
      result.current.clearAllPendingSubmissions()
    })
  })
})
