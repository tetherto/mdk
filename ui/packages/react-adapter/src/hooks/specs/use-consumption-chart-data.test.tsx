import { authStore } from '@tetherto/mdk-ui-foundation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useConsumptionChartData } from '../use-consumption-chart-data'

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

describe('useConsumptionChartData', () => {
  beforeEach(() => {
    authStore.getState().setToken('token')
  })
  afterEach(() => {
    authStore.getState().reset()
    vi.unstubAllGlobals()
  })

  it('defaults powerAttribute to power_w_sum_aggr and tag to t-miner', async () => {
    const fetchImpl = respond([[{ ts: 1, power_w_sum_aggr: 9000 }]])
    vi.stubGlobal('fetch', fetchImpl)

    const { result } = renderHook(
      () => useConsumptionChartData({ timeline: '5m', refetchInterval: 0 }),
      { wrapper: wrapper(makeClient()) },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([{ ts: 1, power_w_sum_aggr: 9000 }])
    const url = fetchImpl.mock.calls[0]![0] as string
    expect(url).toContain(`tag=${encodeURIComponent('t-miner')}`)
    expect(decodeURIComponent(url)).toContain('"power_w_sum_aggr":1')
  })

  it('uses custom powerAttribute when supplied (transformer-level)', async () => {
    const fetchImpl = respond([[]])
    vi.stubGlobal('fetch', fetchImpl)

    renderHook(
      () =>
        useConsumptionChartData({
          timeline: '1m',
          tag: 't-powermeter',
          powerAttribute: 'power_w_aggr',
          refetchInterval: 0,
        }),
      { wrapper: wrapper(makeClient()) },
    )

    await waitFor(() => expect(fetchImpl).toHaveBeenCalled())
    const url = decodeURIComponent(fetchImpl.mock.calls[0]![0] as string)
    expect(url).toContain('tag=t-powermeter')
    expect(url).toContain('"power_w_aggr":1')
  })

  it('returns [] when the response head is missing', async () => {
    vi.stubGlobal('fetch', respond([]))
    const { result } = renderHook(
      () => useConsumptionChartData({ timeline: '3h', refetchInterval: 0 }),
      { wrapper: wrapper(makeClient()) },
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })
})
