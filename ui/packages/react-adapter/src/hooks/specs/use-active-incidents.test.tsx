import { authStore } from '@tetherto/mdk-ui-foundation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useActiveIncidents } from '../use-active-incidents'

const wrapper = (client: QueryClient) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return Wrapper
}

describe('useActiveIncidents', () => {
  beforeEach(() => {
    authStore.getState().setToken('token')
  })

  afterEach(() => {
    authStore.getState().reset()
    vi.unstubAllGlobals()
  })

  it('maps a list-things response into sorted incident rows', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify([
            [
              {
                id: 'm1',
                type: 'miner',
                info: { container: 'C1', pos: 'A-1' },
                last: {
                  alerts: [
                    {
                      uuid: 'low',
                      name: 'Low Hashrate',
                      description: 'under 80%',
                      severity: 'medium',
                      createdAt: 1700000000000,
                    },
                  ],
                },
              },
              {
                id: 'm2',
                type: 'miner',
                info: { container: 'C2', pos: 'B-3' },
                last: {
                  alerts: [
                    {
                      uuid: 'hi',
                      name: 'Overheat',
                      description: 'hashboard hot',
                      severity: 'critical',
                      createdAt: 1700000010000,
                    },
                  ],
                },
              },
            ],
          ]),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
    )
    vi.stubGlobal('fetch', fetchImpl)

    const client = new QueryClient({
      defaultOptions: {
        queries: { meta: { apiBaseUrl: 'http://api' }, retry: false },
      },
    })

    const { result } = renderHook(() => useActiveIncidents({ refetchInterval: 0 }), {
      wrapper: wrapper(client),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(2)
    expect(result.current.data?.[0]).toMatchObject({ id: 'hi', severity: 'critical' })
    expect(result.current.data?.[1]).toMatchObject({ id: 'low', severity: 'medium' })

    const calledUrl = fetchImpl.mock.calls[0]![0] as string
    expect(calledUrl).toContain('/auth/list-things?')
    expect(calledUrl).toContain('status=1')
    expect(calledUrl).toContain('query=')
    expect(calledUrl).toContain('fields=')
  })

  it('renders container-level alerts (no info.pos) with the container as the subtitle', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify([
              [
                {
                  id: 'container-1',
                  type: 'container-as-hk3',
                  info: { container: 'bitmain-hydro-2' },
                  last: {
                    alerts: [
                      {
                        uuid: 'leak',
                        name: 'leakage_fault',
                        description: 'Liquid leakage detected',
                        severity: 'critical',
                        createdAt: 1700000000000,
                      },
                    ],
                  },
                },
              ],
            ]),
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
      ),
    )
    const client = new QueryClient({
      defaultOptions: { queries: { meta: { apiBaseUrl: 'http://api' }, retry: false } },
    })
    const { result } = renderHook(() => useActiveIncidents({ refetchInterval: 0 }), {
      wrapper: wrapper(client),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.[0]).toMatchObject({
      id: 'leak',
      title: 'leakage_fault',
      severity: 'critical',
      subtitle: 'bitmain-hydro-2',
    })
  })

  it('falls back to an empty list when the API returns a non-array body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ unexpected: 'shape' }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
      ),
    )
    const client = new QueryClient({
      defaultOptions: { queries: { meta: { apiBaseUrl: 'http://api' }, retry: false } },
    })
    const { result } = renderHook(() => useActiveIncidents({ refetchInterval: 0 }), {
      wrapper: wrapper(client),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })

  it('falls back to an empty list when the API returns an array of non-arrays', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify(['not-an-array']), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
      ),
    )
    const client = new QueryClient({
      defaultOptions: { queries: { meta: { apiBaseUrl: 'http://api' }, retry: false } },
    })
    const { result } = renderHook(() => useActiveIncidents({ refetchInterval: 0 }), {
      wrapper: wrapper(client),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })

  it('returns an empty list when no devices have alerts', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify([[]]), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
      ),
    )
    const client = new QueryClient({
      defaultOptions: { queries: { meta: { apiBaseUrl: 'http://api' }, retry: false } },
    })
    const { result } = renderHook(() => useActiveIncidents({ refetchInterval: 0 }), {
      wrapper: wrapper(client),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })
})
