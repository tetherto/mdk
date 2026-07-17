import { authStore } from '@tetherto/mdk-ui-foundation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePoolRows } from '../use-pool-rows'

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

describe('usePoolRows', () => {
  beforeEach(() => {
    authStore.getState().setToken('token')
  })
  afterEach(() => {
    authStore.getState().reset()
    vi.unstubAllGlobals()
  })

  it('builds one row per configured pool with display name + PH/s conversion', async () => {
    vi.stubGlobal(
      'fetch',
      respondWith([
        [
          {
            stats: [
              {
                poolType: 'f2pool',
                hashrate: 901_000_000_000_000,
                revenue_24h: 0.0521,
                worker_count: 100,
                active_workers_count: 98,
              },
              {
                poolType: 'ocean',
                hashrate: 53_630_000_000_000_000,
                revenue_24h: 0,
                worker_count: 105,
                active_workers_count: 103,
              },
            ],
          },
        ],
      ]),
    )

    const { result } = renderHook(() => usePoolRows({ refetchInterval: 0 }), {
      wrapper: wrapper(makeClient()),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.rows).toHaveLength(2)
    expect(result.current.rows[0]).toMatchObject({
      poolType: 'f2pool',
      name: 'minerpool-f2pool-shelf-0',
      hashrateHs: 901_000_000_000_000,
      revenue24hBtc: 0.0521,
    })
    expect(result.current.rows[0]?.details).toEqual([
      { title: 'Id', value: 'minerpool-f2pool-shelf-0' },
      { title: 'Rack', value: 'minerpool-f2pool-shelf' },
      { title: 'User name', value: '' },
      { title: 'Balance', value: '' },
      { title: 'Unsettled', value: '' },
      { title: 'Revenue last 24hrs', value: 0.0521 },
      { title: 'Active Worker Count', value: 98 },
    ])
    expect(result.current.rows[0]?.hashratePhs).toBeCloseTo(0.901, 3)
    expect(result.current.rows[1]).toMatchObject({
      poolType: 'ocean',
      name: 'minerpool-ocean-shelf-0',
      hashrateHs: 53_630_000_000_000_000,
    })
    expect(result.current.rows[1]?.hashratePhs).toBeCloseTo(53.63, 2)
  })

  it('skips entries with no poolType and tolerates missing numeric fields', async () => {
    vi.stubGlobal(
      'fetch',
      respondWith([
        [
          {
            stats: [
              { poolType: 'f2pool' },
              { hashrate: 1, revenue_24h: 1 },
              { poolType: '', hashrate: 1 },
            ],
          },
        ],
      ]),
    )

    const { result } = renderHook(() => usePoolRows({ refetchInterval: 0 }), {
      wrapper: wrapper(makeClient()),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.rows).toHaveLength(1)
    expect(result.current.rows[0]?.poolType).toBe('f2pool')
    expect(result.current.rows[0]?.hashrateHs).toBeUndefined()
    expect(result.current.rows[0]?.revenue24hBtc).toBeUndefined()
  })

  it('returns an empty list when the response carries no pools', async () => {
    vi.stubGlobal('fetch', respondWith([[]]))

    const { result } = renderHook(() => usePoolRows({ refetchInterval: 0 }), {
      wrapper: wrapper(makeClient()),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.rows).toEqual([])
  })
})
