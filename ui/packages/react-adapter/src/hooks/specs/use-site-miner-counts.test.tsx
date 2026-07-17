import { authStore } from '@tetherto/mdk-ui-foundation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSiteMinerCounts } from '../use-site-miner-counts'

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

describe('useSiteMinerCounts', () => {
  beforeEach(() => {
    authStore.getState().setToken('token')
  })
  afterEach(() => {
    authStore.getState().reset()
    vi.unstubAllGlobals()
  })

  it('aggregates online / offline / error tallies and asks for status=1', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify([
            [
              { id: 'a', type: 'miner-x', last: { status: 'online' } },
              { id: 'b', type: 'miner-x', last: { status: 'online' } },
              { id: 'c', type: 'miner-x', last: { status: 'error' } },
              { id: 'd', type: 'miner-x', last: { status: 'offline' } },
              { id: 'e', type: 'miner-x' },
            ],
          ]),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
    )
    vi.stubGlobal('fetch', fetchImpl)
    const { result } = renderHook(() => useSiteMinerCounts({ refetchInterval: 0 }), {
      wrapper: wrapper(makeClient()),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ total: 5, online: 2, offline: 2, error: 1 })
    expect(String(fetchImpl.mock.calls[0]![0])).toContain('status=1')
  })

  it('returns zeros when the response is empty', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify([[]]), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
      ),
    )
    const { result } = renderHook(() => useSiteMinerCounts({ refetchInterval: 0 }), {
      wrapper: wrapper(makeClient()),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ total: 0, online: 0, offline: 0, error: 0 })
  })
})
