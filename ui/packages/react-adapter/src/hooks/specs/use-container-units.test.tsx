import { authStore } from '@tetherto/mdk-ui-foundation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useContainerUnits } from '../use-container-units'

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

describe('useContainerUnits', () => {
  beforeEach(() => {
    authStore.getState().setToken('token')
  })
  afterEach(() => {
    authStore.getState().reset()
    vi.unstubAllGlobals()
  })

  it('fetches /auth/list-things for containers and unwraps the nested rows', async () => {
    const row = {
      id: 'unit-1',
      type: 'container-x',
      info: { container: 'c1', poolConfig: 'pool-1' },
      last: { snap: { stats: { status: 'running' } } },
    }
    const fetchSpy = respondWith([[row]])
    vi.stubGlobal('fetch', fetchSpy)

    const { result } = renderHook(() => useContainerUnits({ refetchInterval: 0 }), {
      wrapper: wrapper(makeClient()),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toEqual([row])

    const url = fetchSpy.mock.calls[0]![0] as string
    expect(url).toContain('http://api/auth/list-things')
    expect(url).toContain('tag=t-container')
  })

  it('returns an empty array when the response is not a nested list', async () => {
    vi.stubGlobal('fetch', respondWith([]))

    const { result } = renderHook(() => useContainerUnits({ refetchInterval: 0 }), {
      wrapper: wrapper(makeClient()),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toEqual([])
  })
})
