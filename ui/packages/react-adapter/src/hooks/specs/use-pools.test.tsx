import { authStore } from '@tetherto/mdk-ui-foundation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { usePools } from '../use-pools'

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

describe('usePools', () => {
  beforeEach(() => {
    authStore.getState().setToken('token')
  })
  afterEach(() => {
    authStore.getState().reset()
    vi.unstubAllGlobals()
  })

  it('unwraps the { pools, summary } envelope from /auth/pools', async () => {
    const fetchSpy = respondWith({
      pools: [{ name: 'f2pool', hashrate: 1, workers: 10 }],
      summary: { poolCount: 1, totalHashrate: 1, totalWorkers: 10, totalBalance: 0 },
    })
    vi.stubGlobal('fetch', fetchSpy)

    const { result } = renderHook(() => usePools({ refetchInterval: 0 }), {
      wrapper: wrapper(makeClient()),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toEqual([{ name: 'f2pool', hashrate: 1, workers: 10 }])
    expect((fetchSpy.mock.calls[0]![0] as string)).toBe('http://api/auth/pools')
  })

  it('stays disabled (no fetch) when no auth token is present', () => {
    authStore.getState().reset()
    const fetchSpy = respondWith({ pools: [], summary: {} })
    vi.stubGlobal('fetch', fetchSpy)

    renderHook(() => usePools({ refetchInterval: 0 }), { wrapper: wrapper(makeClient()) })

    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
