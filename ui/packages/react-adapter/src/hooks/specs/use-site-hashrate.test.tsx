import { authStore } from '@tetherto/mdk-ui-core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSiteHashrate } from '../use-site-hashrate'

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

const respond = (body: unknown) =>
  vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
  )

describe('useSiteHashrate', () => {
  beforeEach(() => {
    authStore.getState().setToken('token')
  })
  afterEach(() => {
    authStore.getState().reset()
    vi.unstubAllGlobals()
  })

  it('returns the freshest sample converted to PH/s', async () => {
    vi.stubGlobal(
      'fetch',
      respond([
        [
          { ts: 1, hashrate_mhs_1m_sum_aggr: 1_000_000_000 },
          { ts: 2, hashrate_mhs_1m_sum_aggr: 2_000_000_000 },
        ],
      ]),
    )
    const { result } = renderHook(() => useSiteHashrate({ timeline: '5m', refetchInterval: 0 }), {
      wrapper: wrapper(makeClient()),
    })
    await waitFor(() => expect(result.current.valueMhs).toBe(2_000_000_000))
    expect(result.current.valuePhs).toBe(2)
  })

  it('falls back to the 5m aggregate when 1m is absent', async () => {
    vi.stubGlobal('fetch', respond([[{ ts: 1, hashrate_mhs_5m_sum_aggr: 500_000_000 }]]))
    const { result } = renderHook(() => useSiteHashrate({ timeline: '5m', refetchInterval: 0 }), {
      wrapper: wrapper(makeClient()),
    })
    await waitFor(() => expect(result.current.valueMhs).toBe(500_000_000))
    expect(result.current.valuePhs).toBe(0.5)
  })

  it('returns undefined values when the response is empty', async () => {
    vi.stubGlobal('fetch', respond([[]]))
    const { result } = renderHook(() => useSiteHashrate({ timeline: '5m', refetchInterval: 0 }), {
      wrapper: wrapper(makeClient()),
    })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.valuePhs).toBeUndefined()
    expect(result.current.valueMhs).toBeUndefined()
  })
})
