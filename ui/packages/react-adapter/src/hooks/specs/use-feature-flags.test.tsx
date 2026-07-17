import { authStore } from '@tetherto/mdk-ui-foundation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useFeatureFlags } from '../use-feature-flags'

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

describe('useFeatureFlags', () => {
  beforeEach(() => {
    authStore.getState().setToken('token')
  })
  afterEach(() => {
    authStore.getState().reset()
    vi.unstubAllGlobals()
  })

  it('fetches the camelCase /auth/featureConfig route and exposes flag helpers', async () => {
    const fetchSpy = respondWith({
      containerCharts: true,
      poolStats: false,
    })
    vi.stubGlobal('fetch', fetchSpy)

    const { result } = renderHook(() => useFeatureFlags(), { wrapper: wrapper(makeClient()) })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    const url = String(fetchSpy.mock.calls[0]?.[0])
    expect(url).toBe('http://api/auth/featureConfig')

    expect(result.current.isEnabled('containerCharts')).toBe(true)
    expect(result.current.isEnabled('poolStats')).toBe(false)
    expect(result.current.isEnabled('missingFlag')).toBe(false)
  })

  it('defaults to empty flags while loading', () => {
    vi.stubGlobal('fetch', respondWith({}))
    const { result } = renderHook(() => useFeatureFlags(), { wrapper: wrapper(makeClient()) })
    expect(result.current.flags).toEqual({})
    expect(result.current.isEnabled('anything')).toBe(false)
  })
})
