import { authStore } from '@tetherto/mdk-ui-foundation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePowerModeTimelineData } from '../use-power-mode-timeline-data'

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

describe('usePowerModeTimelineData', () => {
  beforeEach(() => {
    authStore.getState().setToken('token')
  })
  afterEach(() => {
    authStore.getState().reset()
    vi.unstubAllGlobals()
  })

  it('returns the first row and requests both power_mode and status aggregates', async () => {
    const row = [{ ts: 1, power_mode_group_aggr: { auto: 5 }, status_group_aggr: { ok: 5 } }]
    const fetchImpl = respond([row])
    vi.stubGlobal('fetch', fetchImpl)

    const { result } = renderHook(
      () => usePowerModeTimelineData({ timeline: '5m', refetchInterval: 0 }),
      { wrapper: wrapper(makeClient()) },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(row)
    const url = decodeURIComponent(fetchImpl.mock.calls[0]![0] as string)
    expect(url).toContain('"power_mode_group_aggr":1')
    expect(url).toContain('"status_group_aggr":1')
    expect(url).toContain('tag=t-miner')
  })

  it('accepts a custom tag and time window', async () => {
    const fetchImpl = respond([[]])
    vi.stubGlobal('fetch', fetchImpl)
    renderHook(
      () =>
        usePowerModeTimelineData({
          timeline: '1m',
          tag: 'custom',
          start: 10,
          end: 99,
          refetchInterval: 0,
        }),
      { wrapper: wrapper(makeClient()) },
    )
    await waitFor(() => expect(fetchImpl).toHaveBeenCalled())
    const url = fetchImpl.mock.calls[0]![0] as string
    expect(url).toContain('tag=custom')
    expect(url).toContain('start=10')
    expect(url).toContain('end=99')
  })

  it('returns [] when the response head is not an array', async () => {
    vi.stubGlobal('fetch', respond([null]))
    const { result } = renderHook(
      () => usePowerModeTimelineData({ timeline: '5m', refetchInterval: 0 }),
      { wrapper: wrapper(makeClient()) },
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })
})
