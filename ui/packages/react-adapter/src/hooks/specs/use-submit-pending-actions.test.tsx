import { actionsStore, authStore } from '@tetherto/mdk-ui-foundation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useSubmitPendingActions } from '../use-submit-pending-actions'

const wrapper = (client: QueryClient) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return Wrapper
}

const makeClient = () =>
  new QueryClient({
    defaultOptions: { queries: { meta: { apiBaseUrl: 'http://api' }, retry: false } },
  })

const respondWith = (body: unknown) =>
  vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
  )

describe('useSubmitPendingActions', () => {
  beforeEach(() => {
    authStore.getState().setToken('token')
    authStore.getState().setPermissions({ permissions: ['actions:w'], write: true })
    actionsStore.getState().clearAllPendingSubmissions()
  })
  afterEach(() => {
    authStore.getState().reset()
    actionsStore.getState().clearAllPendingSubmissions()
    vi.unstubAllGlobals()
  })

  it('drains the queue, POSTs each action, strips the local id, then clears', async () => {
    const fetchSpy = respondWith({ ok: true })
    vi.stubGlobal('fetch', fetchSpy)

    actionsStore.getState().setAddPendingSubmissionAction({
      type: 'voting',
      action: 'registerConfig',
      params: [{ type: 'pool', data: { poolConfigName: 'X' } }],
    })
    actionsStore.getState().setAddPendingSubmissionAction({
      action: 'setupPools',
      query: { id: { $in: ['d1'] } },
      params: [{ poolConfigId: 'p1', configType: 'pool' }],
    })

    const { result } = renderHook(() => useSubmitPendingActions(), {
      wrapper: wrapper(makeClient()),
    })

    expect(result.current.canSubmit).toBe(true)
    expect(result.current.pendingCount).toBe(2)

    await act(async () => {
      await result.current.submit()
    })

    expect(fetchSpy).toHaveBeenCalledTimes(2)
    const [firstUrl, firstInit] = fetchSpy.mock.calls[0]!
    expect(firstUrl).toBe('http://api/auth/actions/voting')
    expect((firstInit as RequestInit).method).toBe('POST')
    const firstBody = JSON.parse((firstInit as RequestInit).body as string)
    expect(firstBody).toEqual({
      action: 'registerConfig',
      params: [{ type: 'pool', data: { poolConfigName: 'X' } }],
    })
    expect(firstBody).not.toHaveProperty('id')

    await waitFor(() => expect(result.current.pendingCount).toBe(0))
  })

  it('reports canSubmit=false without actions:w', () => {
    vi.stubGlobal('fetch', respondWith({}))
    authStore.getState().setPermissions({ permissions: [] })

    const { result } = renderHook(() => useSubmitPendingActions(), {
      wrapper: wrapper(makeClient()),
    })

    expect(result.current.canSubmit).toBe(false)
  })

  it('throws and keeps the queue intact when the server returns an embedded ERR_KERNEL error', async () => {
    vi.stubGlobal('fetch', respondWith([{ errors: ['ERR_KERNEL_ACTION_CALLS_EMPTY'] }]))

    actionsStore.getState().setAddPendingSubmissionAction({
      action: 'setupPools',
      query: { id: { $in: ['d1'] } },
      params: [{ poolConfigId: 'p1', configType: 'pool' }],
    })

    const { result } = renderHook(() => useSubmitPendingActions(), {
      wrapper: wrapper(makeClient()),
    })

    await act(async () => {
      await expect(result.current.submit()).rejects.toThrow(
        'This user role is not authorized to submit this action',
      )
    })

    expect(actionsStore.getState().pendingSubmissions).toHaveLength(1)
  })

  it('throws with the first array error when the server returns a generic embedded error', async () => {
    vi.stubGlobal('fetch', respondWith([{ errors: ['SOME_OTHER_ERROR'] }]))

    actionsStore.getState().setAddPendingSubmissionAction({
      action: 'registerConfig',
      params: [{ type: 'pool', data: { poolConfigName: 'Y' } }],
    })

    const { result } = renderHook(() => useSubmitPendingActions(), {
      wrapper: wrapper(makeClient()),
    })

    await act(async () => {
      await expect(result.current.submit()).rejects.toThrow('SOME_OTHER_ERROR')
    })
  })

  it('throws with the string error when errors is a plain string', async () => {
    vi.stubGlobal('fetch', respondWith([{ errors: 'string-level-error' }]))

    actionsStore.getState().setAddPendingSubmissionAction({
      action: 'registerConfig',
      params: [{ type: 'pool', data: { poolConfigName: 'Z' } }],
    })

    const { result } = renderHook(() => useSubmitPendingActions(), {
      wrapper: wrapper(makeClient()),
    })

    await act(async () => {
      await expect(result.current.submit()).rejects.toThrow('string-level-error')
    })
  })

  it('resolves immediately with an empty results array when the queue is empty', async () => {
    vi.stubGlobal('fetch', respondWith({}))

    const { result } = renderHook(() => useSubmitPendingActions(), {
      wrapper: wrapper(makeClient()),
    })

    expect(result.current.pendingCount).toBe(0)

    let results!: unknown[]
    await act(async () => {
      results = await result.current.submit()
    })

    expect(results).toEqual([])
    expect(vi.mocked(fetch)).not.toHaveBeenCalled()
  })
})
