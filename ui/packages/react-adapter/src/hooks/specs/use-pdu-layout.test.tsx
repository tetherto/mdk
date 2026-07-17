import { authStore } from '@tetherto/mdk-ui-foundation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { usePduLayout } from '../use-pdu-layout'

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

describe('usePduLayout', () => {
  beforeEach(() => {
    authStore.getState().setToken('token')
  })
  afterEach(() => {
    authStore.getState().reset()
    vi.unstubAllGlobals()
  })

  it('fetches /auth/pdu-layout for the container type and exposes the grid', async () => {
    const layout = [{ pdu: '1-1', sockets: [{ socket: 'a1', enabled: false }] }]
    const fetchSpy = respondWith({ type: 'container-bd-d40-s19xp', layout })
    vi.stubGlobal('fetch', fetchSpy)

    const { result } = renderHook(() => usePduLayout({ type: 'container-bd-d40-s19xp' }), {
      wrapper: wrapper(makeClient()),
    })

    await waitFor(() => expect(result.current.hasPduLayout).toBe(true))
    expect(result.current.layout).toEqual(layout)
    const url = String(fetchSpy.mock.calls[0]?.[0])
    expect(url).toBe('http://api/auth/pdu-layout?type=container-bd-d40-s19xp')
  })

  it('skips fetching without a type', () => {
    const fetchSpy = respondWith({ type: 'x', layout: [] })
    vi.stubGlobal('fetch', fetchSpy)

    const { result } = renderHook(() => usePduLayout({ type: undefined }), {
      wrapper: wrapper(makeClient()),
    })
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(result.current.hasPduLayout).toBe(false)
  })
})
