import { authStore } from '@tetherto/mdk-ui-foundation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { usePoolManagerDashboard } from '../use-pool-manager-dashboard'

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
    if (url.includes('/auth/site/status/live')) {
      // Consolidated live site-status snapshot (useSiteStatusLive).
      return json({
        miners: { online: 7, offline: 3, error: 5, total: 15, containerCapacity: 0 },
      })
    }
    if (url.includes('/auth/list-things') && url.includes('poolConfig')) {
      // Configured miners count query → two configured miners.
      return json([[{ id: 'm1' }, { id: 'm2' }]])
    }
    if (url.includes('/auth/list-things')) {
      // Alert-bearing devices.
      return json([
        [
          {
            id: 'd1',
            last: {
              alerts: [
                { uuid: 'a-old', name: 'Old', description: 'older', severity: 'medium', createdAt: 10 },
                { uuid: 'a-new', name: 'New', description: 'newer', severity: 'critical', createdAt: 99 },
              ],
            },
          },
        ],
      ])
    }
    return json([])
  })

describe('usePoolManagerDashboard', () => {
  beforeEach(() => {
    authStore.getState().setToken('token')
  })
  afterEach(() => {
    authStore.getState().reset()
    vi.unstubAllGlobals()
  })

  it('builds total / configured / errors stats from the live site-status snapshot and a list-things count', async () => {
    vi.stubGlobal('fetch', routedFetch())

    const { result } = renderHook(() => usePoolManagerDashboard({ refetchInterval: 0 }), {
      wrapper: wrapper(makeClient()),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    const items = result.current.stats.items
    // total = miners.total (15) from /auth/site/status/live
    expect(items[0]).toEqual({ label: 'Total Miners', value: 15, type: 'SUCCESS' })
    // configured = 2 of 15 → 13.33%
    expect(items[1]).toEqual({
      label: 'Configured Miners',
      value: 2,
      secondaryValue: '13.33%',
      type: 'SUCCESS',
    })
    // errors = miners.error (5)
    expect(items[2]).toEqual({ label: 'Errors', value: 5, type: 'ERROR' })
  })

  it('flattens current alert devices into a recent-first feed stamped with device id', async () => {
    vi.stubGlobal('fetch', routedFetch())

    const { result } = renderHook(() => usePoolManagerDashboard({ refetchInterval: 0 }), {
      wrapper: wrapper(makeClient()),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.alerts).toHaveLength(2)
    expect(result.current.alerts[0]).toMatchObject({
      id: 'a-new',
      uuid: 'a-new',
      severity: 'critical',
      code: 'd1',
    })
    expect(result.current.alerts[1]?.id).toBe('a-old')
  })

  it('shows 0% configured and SUCCESS type for Errors when total miners is zero', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: unknown) => {
        const url = String(input)
        if (url.includes('/auth/site/status/live')) {
          return new Response(
            JSON.stringify({
              miners: { online: 0, offline: 0, error: 0, total: 0, containerCapacity: 0 },
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          )
        }
        return new Response(JSON.stringify([[]]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }),
    )

    const { result } = renderHook(() => usePoolManagerDashboard({ refetchInterval: 0 }), {
      wrapper: wrapper(makeClient()),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    const items = result.current.stats.items
    expect(items[1]?.secondaryValue).toBe('0%')
    expect(items[2]?.type).toBe('SUCCESS')
  })

  it('defaults configured count to 0 when enabled is false', () => {
    vi.stubGlobal('fetch', vi.fn())

    const { result } = renderHook(
      () => usePoolManagerDashboard({ enabled: false, refetchInterval: 0 }),
      { wrapper: wrapper(makeClient()) },
    )

    // configured.data is undefined when the query is disabled; defaults to 0
    expect(result.current.stats.items[1]?.value).toBe(0)
  })

  it('issues no network requests when enabled is false', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    renderHook(() => usePoolManagerDashboard({ enabled: false, refetchInterval: 0 }), {
      wrapper: wrapper(makeClient()),
    })

    // Give any (incorrectly) enabled queries a tick to fire.
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('issues no network requests when there is no auth token', async () => {
    authStore.getState().reset()
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    renderHook(() => usePoolManagerDashboard({ refetchInterval: 0 }), {
      wrapper: wrapper(makeClient()),
    })

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
