import { authStore } from '@tetherto/mdk-ui-foundation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { usePoolBalanceHistory } from '../use-pool-balance-history'

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

describe('usePoolBalanceHistory', () => {
  beforeEach(() => {
    authStore.getState().setToken('token')
  })
  afterEach(() => {
    authStore.getState().reset()
    vi.unstubAllGlobals()
  })

  it('unwraps the { log } envelope for the given pool with range params', async () => {
    const fetchSpy = respondWith({ log: [{ ts: 1, revenue: 0.1, balance: 0.1 }] })
    vi.stubGlobal('fetch', fetchSpy)

    const { result } = renderHook(
      () => usePoolBalanceHistory('f2pool', { range: '1W', refetchInterval: 0 }),
      { wrapper: wrapper(makeClient()) },
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toEqual([{ ts: 1, revenue: 0.1, balance: 0.1 }])
    expect((fetchSpy.mock.calls[0]![0] as string)).toBe(
      'http://api/auth/pools/f2pool/balance-history?range=1W',
    )
  })

  it('stays disabled (no fetch) when no pool is supplied', () => {
    const fetchSpy = respondWith([])
    vi.stubGlobal('fetch', fetchSpy)

    const { result } = renderHook(() => usePoolBalanceHistory('', { refetchInterval: 0 }), {
      wrapper: wrapper(makeClient()),
    })

    expect(result.current.data).toEqual([])
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
