import { actionsStore, authStore, buildRebootAction } from '@tetherto/mdk-ui-foundation'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { useDeviceAction } from '../use-device-action'

describe('useDeviceAction', () => {
  beforeEach(() => {
    authStore.getState().setToken('token')
    authStore.getState().setPermissions({ permissions: ['actions:w'], write: true })
    actionsStore.getState().clearAllPendingSubmissions()
  })
  afterEach(() => {
    authStore.getState().reset()
    actionsStore.getState().clearAllPendingSubmissions()
  })

  it('queues a built submission into the shared pending queue', () => {
    const { result } = renderHook(() => useDeviceAction())
    expect(result.current.canSubmit).toBe(true)

    act(() => {
      result.current.queueAction(buildRebootAction(['id-miner-1']))
    })

    const queued = actionsStore.getState().pendingSubmissions
    expect(queued).toHaveLength(1)
    expect(queued[0]).toMatchObject({
      type: 'voting',
      action: 'reboot',
      tags: ['id-miner-1'],
      params: [],
    })
    expect(typeof queued[0]?.id).toBe('number')
  })

  it('reports missing actions:w permission', () => {
    authStore.getState().setPermissions({ permissions: ['alerts:r'], write: false })
    const { result } = renderHook(() => useDeviceAction())
    expect(result.current.canSubmit).toBe(false)
  })
})
