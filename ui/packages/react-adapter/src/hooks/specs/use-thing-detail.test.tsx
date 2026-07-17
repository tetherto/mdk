import { authStore } from '@tetherto/mdk-ui-foundation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useThingDetail } from '../use-thing-detail'

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

describe('useThingDetail', () => {
  beforeEach(() => {
    authStore.getState().setToken('token')
  })
  afterEach(() => {
    authStore.getState().reset()
    vi.unstubAllGlobals()
  })

  it('fetches the thing by id with the Op Centre projection and unwraps the row', async () => {
    const row = { id: 'miner-1', type: 'miner-wm-m56s', info: { container: 'bitdeer-1a' } }
    const fetchSpy = respondWith([[row]])
    vi.stubGlobal('fetch', fetchSpy)

    const { result } = renderHook(() => useThingDetail('miner-1', { refetchInterval: 0 }), {
      wrapper: wrapper(makeClient()),
    })

    await waitFor(() => expect(result.current.thing).toEqual(row))
    const url = new URL(String(fetchSpy.mock.calls[0]?.[0]))
    expect(url.pathname).toBe('/auth/list-things')
    expect(JSON.parse(url.searchParams.get('query') ?? '')).toEqual({ id: { $in: ['miner-1'] } })
    expect(url.searchParams.get('limit')).toBe('1')
  })

  it('skips fetching without an id and resolves undefined for missing things', async () => {
    const fetchSpy = respondWith([[]])
    vi.stubGlobal('fetch', fetchSpy)
    const client = makeClient()

    renderHook(() => useThingDetail(undefined), { wrapper: wrapper(client) })
    expect(fetchSpy).not.toHaveBeenCalled()

    const { result } = renderHook(() => useThingDetail('ghost', { refetchInterval: 0 }), {
      wrapper: wrapper(client),
    })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.thing).toBeUndefined()
  })
})
