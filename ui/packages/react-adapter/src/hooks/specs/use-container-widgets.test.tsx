import { authStore } from '@tetherto/mdk-ui-foundation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useContainerWidgets } from '../use-container-widgets'

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

const CONTAINER_ROW = { id: 'c-1', type: 'container-bd-d40-m56', info: { container: 'bitdeer-1a' } }
const REALTIME_ENTRY = {
  ts: 1751000000000,
  status_group_aggr: { 'miner-1': 'on' },
  power_w_sum_aggr: 3500,
}

describe('useContainerWidgets', () => {
  beforeEach(() => {
    authStore.getState().setToken('token')
  })
  afterEach(() => {
    authStore.getState().reset()
    vi.unstubAllGlobals()
  })

  it('fetches containers and the realtime snapshot on separate feeds', async () => {
    const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input))
      const body = url.pathname === '/auth/tail-log' ? [[REALTIME_ENTRY]] : [[CONTAINER_ROW]]
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetchSpy)

    const { result } = renderHook(
      () => useContainerWidgets({ containersRefetchInterval: 0, realtimeRefetchInterval: 0 }),
      { wrapper: wrapper(makeClient()) },
    )

    await waitFor(() => {
      expect(result.current.containers).toEqual([CONTAINER_ROW])
      expect(result.current.realtime).toEqual(REALTIME_ENTRY)
    })

    const urls = fetchSpy.mock.calls.map((call) => new URL(String(call[0])))
    const tailLogUrl = urls.find((url) => url.pathname === '/auth/tail-log')
    expect(tailLogUrl?.searchParams.get('key')).toBe('stat-realtime')
    expect(tailLogUrl?.searchParams.get('tag')).toBe('t-miner')
    expect(tailLogUrl?.searchParams.get('limit')).toBe('1')

    const listUrl = urls.find((url) => url.pathname === '/auth/list-things')
    expect(JSON.parse(listUrl?.searchParams.get('query') ?? '')).toEqual({
      tags: { $in: ['t-container'] },
    })
  })

  it('exposes an undefined realtime sample while workers emit no stats', async () => {
    const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input))
      const body = url.pathname === '/auth/tail-log' ? [[]] : [[CONTAINER_ROW]]
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetchSpy)

    const { result } = renderHook(
      () => useContainerWidgets({ containersRefetchInterval: 0, realtimeRefetchInterval: 0 }),
      { wrapper: wrapper(makeClient()) },
    )

    await waitFor(() => expect(result.current.containers).toHaveLength(1))
    expect(result.current.realtime).toBeUndefined()
  })
})
