import { authStore } from '@tetherto/mdk-ui-foundation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useCurrentUserEmail } from '../use-current-user-email'

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

describe('useCurrentUserEmail', () => {
  beforeEach(() => {
    authStore.getState().setToken('token')
  })
  afterEach(() => {
    authStore.getState().reset()
    vi.unstubAllGlobals()
  })

  it('returns metadata.email when present', async () => {
    vi.stubGlobal('fetch', respondWith({ metadata: { email: 'test@example.com' } }))

    const { result } = renderHook(() => useCurrentUserEmail(), { wrapper: wrapper(makeClient()) })

    await waitFor(() => expect(result.current).toBe('test@example.com'))
    expect((vi.mocked(fetch).mock.calls[0]![0] as string)).toBe('http://api/auth/userinfo')
  })

  it('falls back to top-level email when metadata.email is absent', async () => {
    vi.stubGlobal('fetch', respondWith({ email: 'fallback@example.com' }))

    const { result } = renderHook(() => useCurrentUserEmail(), { wrapper: wrapper(makeClient()) })

    await waitFor(() => expect(result.current).toBe('fallback@example.com'))
  })

  it('prefers metadata.email over top-level email', async () => {
    vi.stubGlobal(
      'fetch',
      respondWith({ email: 'top@example.com', metadata: { email: 'meta@example.com' } }),
    )

    const { result } = renderHook(() => useCurrentUserEmail(), { wrapper: wrapper(makeClient()) })

    await waitFor(() => expect(result.current).toBe('meta@example.com'))
  })

  it('returns undefined when no token is set', () => {
    authStore.getState().reset()
    vi.stubGlobal('fetch', respondWith({ metadata: { email: 'should-not-be-called@x.com' } }))

    const { result } = renderHook(() => useCurrentUserEmail(), { wrapper: wrapper(makeClient()) })

    // Hook disabled when no token — no fetch should fire, result stays undefined
    expect(result.current).toBeUndefined()
    expect(vi.mocked(fetch)).not.toHaveBeenCalled()
  })
})
