import { authStore } from '@tetherto/mdk-ui-foundation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { usePoolConfigsData } from '../use-pool-configs-data'

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

describe('usePoolConfigsData', () => {
  beforeEach(() => {
    authStore.getState().setToken('token')
  })
  afterEach(() => {
    authStore.getState().reset()
    vi.unstubAllGlobals()
  })

  it('fetches /auth/configs/pool and returns raw rows', async () => {
    const fetchSpy = respondWith([{ id: 'p1', poolConfigName: 'Pool One', poolUrls: [] }])
    vi.stubGlobal('fetch', fetchSpy)

    const { result } = renderHook(() => usePoolConfigsData({ refetchInterval: 0 }), {
      wrapper: wrapper(makeClient()),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data[0]).toMatchObject({ id: 'p1', poolConfigName: 'Pool One' })
    expect((fetchSpy.mock.calls[0]![0] as string)).toBe('http://api/auth/configs/pool')
  })

  it('returns an empty array before data resolves', () => {
    vi.stubGlobal('fetch', respondWith([]))
    const { result } = renderHook(() => usePoolConfigsData({ enabled: false }), {
      wrapper: wrapper(makeClient()),
    })
    expect(result.current.data).toEqual([])
  })
})
