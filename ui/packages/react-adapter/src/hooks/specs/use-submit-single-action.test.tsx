import { actionsStore, authStore } from '@tetherto/mdk-ui-foundation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useSubmitSingleAction } from '../use-submit-single-action'

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

const respondWith = (body: unknown, status = 200) =>
  vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      }),
  )

describe('useSubmitSingleAction', () => {
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

  it('POSTs the action to /auth/actions/voting and removes it from the queue on success', async () => {
    vi.stubGlobal('fetch', respondWith([{ id: 42 }]))

    actionsStore.getState().setAddPendingSubmissionAction({
      type: 'voting',
      action: 'registerConfig',
      params: [{ type: 'pool', data: { poolConfigName: 'TestPool' } }],
    })

    const actionId = actionsStore.getState().pendingSubmissions[0]!.id

    const { result } = renderHook(() => useSubmitSingleAction(), {
      wrapper: wrapper(makeClient()),
    })

    expect(result.current.canSubmit).toBe(true)

    await act(async () => {
      await result.current.submitSingle(actionId)
    })

    const [url, init] = (vi.mocked(fetch).mock.calls[0] as [string, RequestInit])
    expect(url).toBe('http://api/auth/actions/voting')
    expect(init.method).toBe('POST')
    const body = JSON.parse(init.body as string) as Record<string, unknown>
    expect(body.action).toBe('registerConfig')
    // Local `id` must be stripped from the payload
    expect(body).not.toHaveProperty('id')

    await waitFor(() =>
      expect(actionsStore.getState().pendingSubmissions).toHaveLength(0),
    )
  })

  it('throws and keeps the queue intact when the server returns an embedded permission error', async () => {
    vi.stubGlobal(
      'fetch',
      respondWith([{ errors: ['ERR_KERNEL_ACTION_CALLS_EMPTY'] }]),
    )

    actionsStore.getState().setAddPendingSubmissionAction({
      action: 'setupPools',
      query: { id: { $in: ['d1'] } },
      params: [{ poolConfigId: 'p1', configType: 'pool' }],
    })

    const actionId = actionsStore.getState().pendingSubmissions[0]!.id

    const { result } = renderHook(() => useSubmitSingleAction(), {
      wrapper: wrapper(makeClient()),
    })

    await act(async () => {
      await expect(result.current.submitSingle(actionId)).rejects.toThrow(
        'This user role is not authorized to submit this action',
      )
    })

    // Action must still be in the queue — not removed on embedded error
    expect(actionsStore.getState().pendingSubmissions).toHaveLength(1)
  })

  it('reports canSubmit=false without actions:w permission', () => {
    authStore.getState().setPermissions({ permissions: [] })

    const { result } = renderHook(() => useSubmitSingleAction(), {
      wrapper: wrapper(makeClient()),
    })

    expect(result.current.canSubmit).toBe(false)
  })

  it('throws when the requested actionId is not in the queue', async () => {
    vi.stubGlobal('fetch', respondWith({}))

    const { result } = renderHook(() => useSubmitSingleAction(), {
      wrapper: wrapper(makeClient()),
    })

    await act(async () => {
      await expect(result.current.submitSingle(9999)).rejects.toThrow('Action 9999 not found')
    })
  })

  it('throws with the first array error when the server returns a non-permission embedded error', async () => {
    vi.stubGlobal('fetch', respondWith([{ errors: ['GENERIC_FAIL'] }]))

    actionsStore.getState().setAddPendingSubmissionAction({
      action: 'setupPools',
      query: { id: { $in: ['d1'] } },
      params: [{ poolConfigId: 'p1', configType: 'pool' }],
    })

    const actionId = actionsStore.getState().pendingSubmissions[0]!.id

    const { result } = renderHook(() => useSubmitSingleAction(), {
      wrapper: wrapper(makeClient()),
    })

    await act(async () => {
      await expect(result.current.submitSingle(actionId)).rejects.toThrow('GENERIC_FAIL')
    })
  })

  it('throws with the string error when the response errors field is a plain string', async () => {
    vi.stubGlobal('fetch', respondWith([{ errors: 'plain-string-error' }]))

    actionsStore.getState().setAddPendingSubmissionAction({
      action: 'registerConfig',
      params: [{ type: 'pool', data: { poolConfigName: 'Err' } }],
    })

    const actionId = actionsStore.getState().pendingSubmissions[0]!.id

    const { result } = renderHook(() => useSubmitSingleAction(), {
      wrapper: wrapper(makeClient()),
    })

    await act(async () => {
      await expect(result.current.submitSingle(actionId)).rejects.toThrow('plain-string-error')
    })
  })

  it('sets submittingActionId while the mutation is in flight', async () => {
    // Use a promise we control so the mutation stays pending long enough to observe
    let resolveRequest!: (v: Response) => void
    const pendingFetch = vi.fn(
      () =>
        new Promise<Response>((res) => {
          resolveRequest = res
        }),
    )
    vi.stubGlobal('fetch', pendingFetch)

    actionsStore.getState().setAddPendingSubmissionAction({
      action: 'registerConfig',
      params: [{ type: 'pool', data: { poolConfigName: 'Inflight' } }],
    })

    const actionId = actionsStore.getState().pendingSubmissions[0]!.id

    const { result } = renderHook(() => useSubmitSingleAction(), {
      wrapper: wrapper(makeClient()),
    })

    // Start but don't await — let it hang
    void act(async () => {
      void result.current.submitSingle(actionId).catch(() => {})
    })

    // Resolve after a microtask tick so isPending updates
    await new Promise((r) => setTimeout(r, 0))

    // Resolve the pending fetch
    resolveRequest(
      new Response(JSON.stringify([{ id: 99 }]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    await waitFor(() => expect(result.current.submittingActionId).toBeNull())
  })
})
