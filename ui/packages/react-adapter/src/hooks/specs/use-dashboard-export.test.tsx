import {
  buildHashrateTailLogParams,
  buildMinerpoolStatsHistoryExtDataParams,
  buildSiteConsumptionTailLogParams,
  queryKeys,
} from '@tetherto/mdk-ui-core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDashboardExport } from '../use-dashboard-export'

const wrapper = (client: QueryClient) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return Wrapper
}

const RANGE = { timeline: '5m' } as const

const seedClient = (): QueryClient => {
  const client = new QueryClient({
    defaultOptions: { queries: { meta: { apiBaseUrl: 'http://api' }, retry: false } },
  })
  client.setQueryData(queryKeys.tailLog(buildHashrateTailLogParams(RANGE)), [
    [
      { ts: 1, hashrate_mhs_1m_sum_aggr: 100 },
      { ts: 2, hashrate_mhs_1m_sum_aggr: 200 },
    ],
  ])
  client.setQueryData(queryKeys.tailLog(buildSiteConsumptionTailLogParams(RANGE)), [
    [{ ts: 1, power_w_sum_aggr: 421_330 }],
  ])
  client.setQueryData(
    ['auth', 'list-things', '{"x":1}'],
    [{ id: 'a', title: 'Bad', subtitle: 'C1', body: 'broke', severity: 'critical' }],
  )
  /* Pool stats snapshot. */
  client.setQueryData(
    queryKeys.extData({ type: 'minerpool', query: JSON.stringify({ key: 'stats' }) }),
    [
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
    ],
  )
  /* Pool history (time-series). */
  client.setQueryData(queryKeys.extData(buildMinerpoolStatsHistoryExtDataParams({})), [
    [
      {
        ts: 1_700_000_000_000,
        stats: [
          { poolType: 'f2pool', hashrate: 9_010_000_000_000_000 },
          { poolType: 'ocean', hashrate: 53_630_000_000_000_000 },
        ],
      },
    ],
  ])
  return client
}

describe('useDashboardExport', () => {
  let createSpy: ReturnType<typeof vi.spyOn>
  let revokeSpy: ReturnType<typeof vi.spyOn>
  let clickSpy: ReturnType<typeof vi.fn>
  let blobs: Blob[]

  beforeEach(() => {
    blobs = []
    createSpy = vi.spyOn(URL, 'createObjectURL').mockImplementation((blob: Blob) => {
      blobs.push(blob)
      return 'blob:fake'
    })
    revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    clickSpy = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(clickSpy)
  })

  afterEach(() => {
    createSpy.mockRestore()
    revokeSpy.mockRestore()
    vi.restoreAllMocks()
  })

  it('exportCsv reads from the cache and triggers a download', async () => {
    const client = seedClient()
    const { result } = renderHook(() => useDashboardExport(RANGE), { wrapper: wrapper(client) })

    result.current.exportCsv()

    expect(createSpy).toHaveBeenCalledOnce()
    expect(clickSpy).toHaveBeenCalledOnce()
    const text = await blobs[0]!.text()
    expect(text).toContain('# Hashrate')
    expect(text).toContain('200')
    expect(text).toContain('# Consumption')
    expect(text).toContain('421330')
    expect(text).toContain('# Pools (current snapshot)')
    expect(text).toContain('f2pool')
    expect(text).toContain('# Pool history')
    expect(text).toContain('53630000000000000')
    expect(text).toContain('# Active incidents')
    expect(text).toContain('Bad')
  })

  it('exportJson emits valid JSON containing all three sections', async () => {
    const client = seedClient()
    const { result } = renderHook(() => useDashboardExport(RANGE), { wrapper: wrapper(client) })

    result.current.export('json')

    const text = await blobs[0]!.text()
    const parsed = JSON.parse(text) as {
      hashrate: unknown[]
      consumption: unknown[]
      incidents: unknown[]
      pools: unknown[]
      poolHistory: unknown[]
    }
    expect(parsed.hashrate).toHaveLength(2)
    expect(parsed.consumption).toHaveLength(1)
    expect(parsed.incidents).toHaveLength(1)
    expect(parsed.pools).toHaveLength(2)
    expect(parsed.poolHistory).toHaveLength(1)
  })
})
