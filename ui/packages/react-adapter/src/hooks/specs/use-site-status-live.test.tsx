import { authStore, type SiteStatusLive } from '@tetherto/mdk-ui-foundation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useSiteStatusLive } from '../use-site-status-live'

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

const snapshot: SiteStatusLive = {
  hashrate: { value: 381913527897.6, nominal: 261120000000, utilization: 146.3, unit: 'MH/s' },
  power: { value: 7664979.96, nominal: 0, utilization: 0, unit: 'W', alert: '', error: false },
  efficiency: { value: 20.07, unit: 'W/TH/s' },
  miners: { online: 1280, offline: 0, error: 1, total: 1281, containerCapacity: 0 },
  alerts: { critical: 1280, high: 0, medium: 1279, total: 2559 },
  pools: { totalHashrate: { value: 105900000, unit: 'MH/s' }, activeWorkers: 0, totalWorkers: 5 },
  ts: 1781822232386,
}

describe('useSiteStatusLive', () => {
  beforeEach(() => {
    authStore.getState().setToken('token')
  })
  afterEach(() => {
    authStore.getState().reset()
    vi.unstubAllGlobals()
  })

  it('polls /auth/site/status/live?overwriteCache=true and returns the snapshot', async () => {
    const fetchSpy = respondWith(snapshot)
    vi.stubGlobal('fetch', fetchSpy)

    const { result } = renderHook(() => useSiteStatusLive({ refetchInterval: 0 }), {
      wrapper: wrapper(makeClient()),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toEqual(snapshot)
    expect(fetchSpy.mock.calls[0]![0] as string).toBe(
      'http://api/auth/site/status/live?overwriteCache=true',
    )
  })

  it('does not fetch when there is no auth token', async () => {
    authStore.getState().reset()
    const fetchSpy = respondWith(snapshot)
    vi.stubGlobal('fetch', fetchSpy)

    renderHook(() => useSiteStatusLive({ refetchInterval: 0 }), {
      wrapper: wrapper(makeClient()),
    })

    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
