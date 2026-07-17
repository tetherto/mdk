import { authStore } from '@tetherto/mdk-ui-foundation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { usePendingActions } from '../use-pending-actions'

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

describe('usePendingActions', () => {
  beforeEach(() => {
    authStore.getState().setToken('token')
  })
  afterEach(() => {
    authStore.getState().reset()
    vi.unstubAllGlobals()
  })

  it('fetches /auth/actions with serialized filters', async () => {
    const fetchSpy = respondWith([{ id: 'a1', status: 'VOTING' }])
    vi.stubGlobal('fetch', fetchSpy)

    const { result } = renderHook(
      () => usePendingActions({ params: { status: ['VOTING', 'APPROVED'] }, refetchInterval: 0 }),
      { wrapper: wrapper(makeClient()) },
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toEqual([{ id: 'a1', status: 'VOTING' }])
    expect((fetchSpy.mock.calls[0]![0] as string)).toBe(
      'http://api/auth/actions?status=VOTING%2CAPPROVED',
    )
  })

  it('uses default empty params when none are provided', async () => {
    const fetchSpy = respondWith([{ id: 'a2', status: 'APPROVED' }])
    vi.stubGlobal('fetch', fetchSpy)

    const { result } = renderHook(() => usePendingActions({ refetchInterval: 0 }), {
      wrapper: wrapper(makeClient()),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toEqual([{ id: 'a2', status: 'APPROVED' }])
  })

  it('does not fetch when enabled is false', () => {
    vi.stubGlobal('fetch', vi.fn())

    const { result } = renderHook(() => usePendingActions({ enabled: false }), {
      wrapper: wrapper(makeClient()),
    })

    expect(result.current.isLoading).toBe(false)
    expect(vi.mocked(fetch)).not.toHaveBeenCalled()
  })
})
