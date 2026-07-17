import { authStore } from '@tetherto/mdk-ui-foundation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useMiners } from '../use-miners'

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

describe('useMiners', () => {
  beforeEach(() => {
    authStore.getState().setToken('token')
  })
  afterEach(() => {
    authStore.getState().reset()
    vi.unstubAllGlobals()
  })

  it('fetches /auth/miners and forwards JSON selectors', async () => {
    const fetchSpy = respondWith([{ id: 'm1', poolConfig: 'p1' }])
    vi.stubGlobal('fetch', fetchSpy)

    const { result } = renderHook(
      () => useMiners({ filter: '{"type":"miner"}', limit: 5, refetchInterval: 0 }),
      { wrapper: wrapper(makeClient()) },
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toEqual([{ id: 'm1', poolConfig: 'p1' }])
    expect(result.current.totalCount).toBe(1)
    const url = fetchSpy.mock.calls[0]![0] as string
    expect(url).toContain('/auth/miners?')
    expect(url).toContain('filter=')
    expect(url).toContain('limit=5')
  })

  it('stays disabled (no fetch) when no auth token is present', () => {
    authStore.getState().reset()
    const fetchSpy = respondWith([])
    vi.stubGlobal('fetch', fetchSpy)

    renderHook(() => useMiners({ refetchInterval: 0 }), { wrapper: wrapper(makeClient()) })

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('unwraps the paginated response envelope and surfaces totalCount', async () => {
    vi.stubGlobal(
      'fetch',
      respondWith({
        data: [
          { id: 'm1', poolConfig: [] },
          { id: 'm2', poolConfig: [{ url: 'stratum+tcp://a' }] },
        ],
        totalCount: 1280,
        offset: 0,
        limit: 50,
        hasMore: true,
      }),
    )

    const { result } = renderHook(() => useMiners({ refetchInterval: 0 }), {
      wrapper: wrapper(makeClient()),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toHaveLength(2)
    expect(result.current.data[0]).toEqual({ id: 'm1', poolConfig: [] })
    // Page rows (2) are unwrapped from the envelope, but the site-wide count wins.
    expect(result.current.totalCount).toBe(1280)
  })
})
