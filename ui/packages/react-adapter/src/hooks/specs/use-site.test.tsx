import { authStore } from '@tetherto/mdk-ui-foundation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useSite } from '../use-site'

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

describe('useSite', () => {
  beforeEach(() => {
    authStore.getState().setToken('token')
  })
  afterEach(() => {
    authStore.getState().reset()
    vi.unstubAllGlobals()
  })

  it('fetches /auth/site and exposes the site label', async () => {
    const fetchSpy = respondWith({ site: 'Site A' })
    vi.stubGlobal('fetch', fetchSpy)

    const { result } = renderHook(() => useSite(), { wrapper: wrapper(makeClient()) })

    await waitFor(() => expect(result.current.site).toBe('Site A'))
    const url = String(fetchSpy.mock.calls[0]?.[0])
    expect(url).toBe('http://api/auth/site')
  })

  it('does not fetch without an auth token', () => {
    authStore.getState().reset()
    const fetchSpy = respondWith({ site: 'x' })
    vi.stubGlobal('fetch', fetchSpy)

    renderHook(() => useSite(), { wrapper: wrapper(makeClient()) })
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
