import { authStore } from '@tetherto/mdk-ui-core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useHashrateChartData } from '../use-hashrate-chart-data'

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

/* Route fetch responses by URL — the hook fans out one tail-log
 * (miner hashrate) and one ext-data (pool history) call. */
const stubMinerAndPool = (opts: {
  miner: unknown[]
  pool: unknown[]
}): ReturnType<typeof vi.fn> => {
  const fetchImpl = vi.fn(async (url: unknown) => {
    const str = String(url)
    const payload = str.includes('/auth/ext-data') ? opts.pool : opts.miner
    return new Response(JSON.stringify([payload]), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  })
  vi.stubGlobal('fetch', fetchImpl)
  return fetchImpl
}

describe('useHashrateChartData', () => {
  beforeEach(() => {
    authStore.getState().setToken('token')
  })
  afterEach(() => {
    authStore.getState().reset()
    vi.unstubAllGlobals()
  })

  it('emits Mining OS + Aggr Pool + per-pool datasets from the two upstream feeds', async () => {
    const fetchImpl = stubMinerAndPool({
      miner: [
        { ts: 1_700_000_000_000, hashrate_mhs_1m_sum_aggr: 60_000_000_000 },
        { ts: 1_700_000_300_000, hashrate_mhs_1m_sum_aggr: 62_500_000_000 },
      ],
      pool: [
        {
          ts: 1_700_000_000_000,
          stats: [
            { poolType: 'f2pool', hashrate: 9_010_000_000_000_000 },
            { poolType: 'ocean', hashrate: 53_630_000_000_000_000 },
          ],
        },
        {
          ts: 1_700_000_300_000,
          stats: [
            { poolType: 'f2pool', hashrate: 9_500_000_000_000_000 },
            { poolType: 'ocean', hashrate: 54_000_000_000_000_000 },
          ],
        },
      ],
    })

    const { result } = renderHook(
      () => useHashrateChartData({ timeline: '5m', refetchInterval: 0 }),
      { wrapper: wrapper(makeClient()) },
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    const data = result.current.data
    expect(data).toBeDefined()

    /* Mining OS first (driving highlighted + min/max/avg). */
    expect(data!.datasets[0]!.label).toBe('Mining OS Hash Rate')
    expect(data!.datasets[0]!.borderColor).toBe('#f7931a')
    expect(data!.datasets[0]!.data).toEqual([
      { x: 1_700_000_000_000, y: 60 },
      { x: 1_700_000_300_000, y: 62.5 },
    ])

    /* Aggr Pool — sum of f2pool + ocean per timestamp. */
    expect(data!.datasets[1]!.label).toBe('Aggr Pool Hash Rate')
    expect(data!.datasets[1]!.borderColor).toBe('#22afff')
    expect(data!.datasets[1]!.data[0]!.y).toBeCloseTo(62.64, 2)
    expect(data!.datasets[1]!.data[1]!.y).toBeCloseTo(63.5, 2)

    /* Per-pool series, alphabetical (f2pool before ocean). */
    expect(data!.datasets[2]!.label).toBe('F2pool Hash Rate')
    expect(data!.datasets[2]!.borderColor).toBe('#8b5cf6')
    expect(data!.datasets[2]!.data[0]!.y).toBeCloseTo(9.01, 2)
    expect(data!.datasets[3]!.label).toBe('Ocean Hash Rate')
    expect(data!.datasets[3]!.borderColor).toBe('#ff3b30')
    expect(data!.datasets[3]!.data[0]!.y).toBeCloseTo(53.63, 2)

    /* Highlighted + footer track Mining OS. */
    expect(data!.highlightedValue).toEqual({ value: '62.500', unit: 'PH/s' })
    expect(data!.minMaxAvg).toEqual({
      min: '60.00 PH/s',
      max: '62.50 PH/s',
      avg: '61.25 PH/s',
    })

    /* Verify both upstream URLs hit. */
    const urls = fetchImpl.mock.calls.map((call) => String(call[0]))
    expect(urls.some((u) => u.includes('/auth/tail-log'))).toBe(true)
    expect(urls.some((u) => u.includes('/auth/ext-data'))).toBe(true)
    const extUrl = urls.find((u) => u.includes('/auth/ext-data'))!
    expect(extUrl).toContain('type=minerpool')
    expect(decodeURIComponent(extUrl)).toContain('stats-history')
  })

  it('falls back to a single Mining OS dataset when pool history is empty', async () => {
    stubMinerAndPool({
      miner: [{ ts: 1_700_000_000_000, hashrate_mhs_1m_sum_aggr: 60_000_000_000 }],
      pool: [],
    })

    const { result } = renderHook(
      () => useHashrateChartData({ timeline: '5m', refetchInterval: 0 }),
      { wrapper: wrapper(makeClient()) },
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data?.datasets).toHaveLength(1)
    expect(result.current.data?.datasets[0]!.label).toBe('Mining OS Hash Rate')
  })

  it('emits one dataset slot when both feeds are empty (with no points)', async () => {
    stubMinerAndPool({ miner: [], pool: [] })

    const { result } = renderHook(
      () => useHashrateChartData({ timeline: '3h', refetchInterval: 0 }),
      { wrapper: wrapper(makeClient()) },
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data?.datasets[0]?.data).toEqual([])
    expect(result.current.data?.highlightedValue).toBeUndefined()
    expect(result.current.data?.minMaxAvg).toBeUndefined()
  })
})
