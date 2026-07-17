import { authStore } from '@tetherto/mdk-ui-foundation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useSitesOverview } from '../use-sites-overview'

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

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })

/** Routes each fetch to a canned response based on the request URL. */
const routedFetch = () =>
  vi.fn(async (input: unknown) => {
    const url = String(input)
    if (url.includes('/auth/list-things')) {
      // t-container inventory with nominal capacity.
      return json([
        [
          {
            id: 'unit-1',
            type: 'container-x',
            info: { container: 'c1', poolConfig: 'pool-1', nominalMinerCapacity: '10' },
            last: { snap: { stats: { status: 'running' } } },
          },
        ],
      ])
    }
    if (url.includes('/auth/pools/stats/containers')) {
      return json([{ container: 'c1', overriddenConfig: 4 }])
    }
    if (url.includes('/auth/tail-log')) {
      // Realtime miner row: per-container hashrate + per-status count maps.
      return json([
        [
          {
            hashrate_mhs_1m_group_sum_aggr: { c1: 1234 },
            power_mode_normal_cnt: { c1: 6 },
            not_mining_cnt: { c1: 1 },
            offline_cnt: { c1: 1 },
          },
        ],
      ])
    }
    return json([])
  })

describe('useSitesOverview', () => {
  beforeEach(() => {
    authStore.getState().setToken('token')
  })
  afterEach(() => {
    authStore.getState().reset()
    vi.unstubAllGlobals()
  })

  it('merges containers, tail-log miner counts, pool stats and hashrate into ready units', async () => {
    vi.stubGlobal('fetch', routedFetch())

    const { result } = renderHook(() => useSitesOverview({ refetchInterval: 0 }), {
      wrapper: wrapper(makeClient()),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.units).toHaveLength(1)
    const unit = result.current.units[0]!
    expect(unit.hashrateMhs).toBe(1234)
    expect(unit.poolStats?.overriddenConfig).toBe(4)
    expect(unit.status).toBe('mining')
    // nominal capacity 10; present = 6 + 1 + 1 = 8 → disconnected 2, actual 8.
    expect(unit.miners).toEqual({ total: 10, disconnected: 2, actualMiners: 8 })
  })

  it('exposes the raw container rows for Site Detail resolution', async () => {
    vi.stubGlobal('fetch', routedFetch())

    const { result } = renderHook(() => useSitesOverview({ refetchInterval: 0 }), {
      wrapper: wrapper(makeClient()),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.rawUnits[0]?.id).toBe('unit-1')
  })
})
