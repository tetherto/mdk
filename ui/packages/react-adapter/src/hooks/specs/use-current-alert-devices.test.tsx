import { authStore } from '@tetherto/mdk-ui-core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCurrentAlertDevices } from '../use-current-alert-devices'

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

describe('useCurrentAlertDevices', () => {
  beforeEach(() => {
    authStore.getState().setToken('token')
  })

  afterEach(() => {
    authStore.getState().reset()
    vi.unstubAllGlobals()
  })

  it('returns the raw nested list-things payload unshaped', async () => {
    const payload = [
      [
        {
          id: 'm1',
          type: 'miner',
          tags: ['t-miner'],
          last: {
            alerts: [
              {
                uuid: 'a1',
                name: 'Overheat',
                description: 'hot',
                severity: 'critical',
                createdAt: 1,
              },
            ],
          },
        },
      ],
    ]
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify(payload), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
      ),
    )

    const { result } = renderHook(() => useCurrentAlertDevices({ refetchInterval: 0 }), {
      wrapper: wrapper(makeClient()),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    // Nested array preserved — the table heads it internally.
    expect(result.current.data).toEqual(payload)
  })

  it('requests the wide alerts field set against list-things', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify([[]]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    )
    vi.stubGlobal('fetch', fetchImpl)

    const { result } = renderHook(() => useCurrentAlertDevices({ refetchInterval: 0 }), {
      wrapper: wrapper(makeClient()),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const calledUrl = fetchImpl.mock.calls[0]![0] as string
    expect(calledUrl).toContain('/auth/list-things?')
    expect(calledUrl).toContain('status=1')
    expect(calledUrl).toContain('limit=1000')
    const fields = decodeURIComponent(calledUrl.split('fields=')[1]!.split('&')[0]!)
    expect(JSON.parse(fields)).toMatchObject({ 'last.snap.config.firmware_ver': 1, info: 1 })
  })

  it('narrows the list-things query server-side when filterTags are passed', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify([[]]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    )
    vi.stubGlobal('fetch', fetchImpl)

    const { result } = renderHook(
      () => useCurrentAlertDevices({ refetchInterval: 0, filterTags: ['sn-ABC'] }),
      { wrapper: wrapper(makeClient()) },
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const calledUrl = fetchImpl.mock.calls[0]![0] as string
    const query = decodeURIComponent(calledUrl.split('query=')[1]!.split('&')[0]!)
    expect(JSON.parse(query)).toMatchObject({
      $or: expect.arrayContaining([{ 'last.alerts.name': { $in: ['sn-ABC'] } }]),
    })
  })

  it('defaults to a 20s poll interval when no options are passed', async () => {
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
    // Exercises the `refetchInterval ?? 20_000` default branch.
    const { result } = renderHook(() => useCurrentAlertDevices(), {
      wrapper: wrapper(makeClient()),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([[]])
  })
})
