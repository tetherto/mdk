import { authStore } from '@tetherto/mdk-ui-foundation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useRackLayout } from '../use-rack-layout'

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

describe('useRackLayout', () => {
  beforeEach(() => {
    authStore.getState().setToken('token')
  })
  afterEach(() => {
    authStore.getState().reset()
    vi.unstubAllGlobals()
  })

  it('fetches /auth/list-racks for the worker type and flattens the per-kernel envelope', async () => {
    const fetchSpy = respondWith([[{ id: 'rack-0' }], [{ id: 'rack-1' }]])
    vi.stubGlobal('fetch', fetchSpy)

    const { result } = renderHook(() => useRackLayout({ type: 'miner' }, { refetchInterval: 0 }), {
      wrapper: wrapper(makeClient()),
    })

    await waitFor(() => expect(result.current.racks).toHaveLength(2))
    expect(result.current.racks).toEqual([{ id: 'rack-0' }, { id: 'rack-1' }])
    const url = String(fetchSpy.mock.calls[0]?.[0])
    expect(url).toBe('http://api/auth/list-racks?type=miner')
  })

  it('skips fetching without a worker type', () => {
    const fetchSpy = respondWith([[]])
    vi.stubGlobal('fetch', fetchSpy)

    const { result } = renderHook(() => useRackLayout({ type: undefined }), {
      wrapper: wrapper(makeClient()),
    })
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(result.current.racks).toEqual([])
  })
})
