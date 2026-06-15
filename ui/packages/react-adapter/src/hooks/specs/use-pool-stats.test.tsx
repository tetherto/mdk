import { authStore } from '@tetherto/mdk-ui-core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePoolStats } from '../use-pool-stats'

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

describe('usePoolStats', () => {
  beforeEach(() => {
    authStore.getState().setToken('token')
  })
  afterEach(() => {
    authStore.getState().reset()
    vi.unstubAllGlobals()
  })

  it('aggregates worker counts and hashrate across pools', async () => {
    const fetchImpl = respondWith([
      [
        {
          ts: '2026-05-21T00:00:00Z',
          stats: [
            {
              poolType: 'f2pool',
              hashrate: 30_000_000_000_000_000,
              worker_count: 100,
              active_workers_count: 98,
            },
            {
              poolType: 'ocean',
              hashrate: 23_785_000_000_000_000,
              worker_count: 105,
              active_workers_count: 103,
            },
          ],
        },
      ],
    ])
    vi.stubGlobal('fetch', fetchImpl)

    const { result } = renderHook(() => usePoolStats({ refetchInterval: 0 }), {
      wrapper: wrapper(makeClient()),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.total).toBe(205)
    expect(result.current.online).toBe(201)
    expect(result.current.mismatch).toBe(4)
    expect(result.current.hashrateHs).toBe(53_785_000_000_000_000)
    expect(result.current.hashratePhs).toBeCloseTo(53.785, 3)
    expect(String(fetchImpl.mock.calls[0]![0])).toContain('type=minerpool')
  })

  it('returns zero counts and undefined hashrate when the response is empty', async () => {
    vi.stubGlobal('fetch', respondWith([[]]))
    const { result } = renderHook(() => usePoolStats({ refetchInterval: 0 }), {
      wrapper: wrapper(makeClient()),
    })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.total).toBe(0)
    expect(result.current.online).toBe(0)
    expect(result.current.mismatch).toBe(0)
    expect(result.current.hashrateHs).toBeUndefined()
    expect(result.current.hashratePhs).toBeUndefined()
  })

  it('caps mismatch at 0 when online exceeds total', async () => {
    vi.stubGlobal(
      'fetch',
      respondWith([
        [
          {
            stats: [
              { poolType: 'f2pool', hashrate: 0, worker_count: 10, active_workers_count: 12 },
            ],
          },
        ],
      ]),
    )
    const { result } = renderHook(() => usePoolStats({ refetchInterval: 0 }), {
      wrapper: wrapper(makeClient()),
    })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.mismatch).toBe(0)
  })
})
