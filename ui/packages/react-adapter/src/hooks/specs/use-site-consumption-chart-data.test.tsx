import { authStore } from '@tetherto/mdk-ui-foundation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSiteConsumptionChartData } from '../use-site-consumption-chart-data'

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

describe('useSiteConsumptionChartData', () => {
  beforeEach(() => {
    authStore.getState().setToken('token')
  })
  afterEach(() => {
    authStore.getState().reset()
    vi.unstubAllGlobals()
  })

  it('shapes the powermeter tail-log into ChartCardData with W → MW conversion', async () => {
    const fetchImpl = respondWith([
      [
        { ts: 1_700_000_000_000, site_power_w: 1_663_000 },
        { ts: 1_700_000_300_000, site_power_w: 1_663_500 },
        { ts: 1_700_000_600_000, site_power_w: 1_664_000 },
      ],
    ])
    vi.stubGlobal('fetch', fetchImpl)

    const { result } = renderHook(
      () => useSiteConsumptionChartData({ timeline: '5m', refetchInterval: 0 }),
      { wrapper: wrapper(makeClient()) },
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    const data = result.current.data
    expect(data).toBeDefined()
    expect(data!.datasets[0]!.label).toBe('Total Consumption')
    expect(data!.datasets[0]!.data).toEqual([
      { x: 1_700_000_000_000, y: 1.663 },
      { x: 1_700_000_300_000, y: 1.6635 },
      { x: 1_700_000_600_000, y: 1.664 },
    ])
    expect(data!.highlightedValue).toEqual({ value: '1.66', unit: 'MW' })
    expect(data!.minMaxAvg).toEqual({ min: '1.66 MW', max: '1.66 MW', avg: '1.66 MW' })
    expect(data!.yTicksFormatter?.(1.66)).toBe('1.66 MW')

    const url = String(fetchImpl.mock.calls[0]![0])
    expect(url).toContain('key=stat-5m')
    expect(url).toContain('type=powermeter')
    expect(url).toContain('tag=t-powermeter')
    expect(url).toContain('site_power_w')
  })

  it('collapses sub-second samples into one second-bucketed point (keeps latest y)', async () => {
    vi.stubGlobal(
      'fetch',
      respondWith([
        [
          { ts: 1_700_000_060_000, site_power_w: 1_667_500 },
          { ts: 1_700_000_000_900, site_power_w: 1_663_000 },
          { ts: 1_700_000_000_100, site_power_w: 1_660_000 },
        ],
      ]),
    )

    const { result } = renderHook(
      () => useSiteConsumptionChartData({ timeline: '5m', refetchInterval: 0 }),
      { wrapper: wrapper(makeClient()) },
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data?.datasets[0]?.data).toEqual([
      { x: 1_700_000_000_000, y: 1.663 },
      { x: 1_700_000_060_000, y: 1.6675 },
    ])
  })

  it('returns an empty dataset when the response payload is empty', async () => {
    vi.stubGlobal('fetch', respondWith([[]]))
    const { result } = renderHook(
      () => useSiteConsumptionChartData({ timeline: '1m', refetchInterval: 0 }),
      { wrapper: wrapper(makeClient()) },
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data?.datasets[0]?.data).toEqual([])
    expect(result.current.data?.highlightedValue).toBeUndefined()
    expect(result.current.data?.minMaxAvg).toBeUndefined()
  })
})
