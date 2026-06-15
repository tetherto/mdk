import { authStore, MdkFetchError } from '@tetherto/mdk-ui-core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTokenPolling } from '../use-token-polling'

const wrapperWithClient = (client: QueryClient) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return Wrapper
}

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    statusText: status === 401 ? 'Unauthorized' : status === 500 ? 'Server Error' : 'OK',
    headers: { 'content-type': 'application/json' },
  })

describe('useTokenPolling', () => {
  beforeEach(() => {
    authStore.getState().reset()
  })

  afterEach(() => {
    authStore.getState().reset()
    vi.unstubAllGlobals()
  })

  it('refreshes the token at the configured interval', async () => {
    authStore.getState().setToken('initial')
    const fetchImpl = vi.fn(async () => jsonResponse(200, { token: 'refreshed' }))
    vi.stubGlobal('fetch', fetchImpl)

    const client = new QueryClient({
      defaultOptions: { queries: { meta: { apiBaseUrl: 'http://api' }, retry: false } },
    })

    renderHook(() => useTokenPolling({ intervalMs: 20 }), {
      wrapper: wrapperWithClient(client),
    })

    await waitFor(() => expect(fetchImpl).toHaveBeenCalled(), { timeout: 1000 })
    await waitFor(() => expect(authStore.getState().token).toBe('refreshed'), { timeout: 1000 })
  })

  it('clears the session on a 401', async () => {
    authStore.getState().setToken('stale')
    const fetchImpl = vi.fn(async () => jsonResponse(401, { error: 'unauthorized' }))
    vi.stubGlobal('fetch', fetchImpl)

    const onSessionEnded = vi.fn()
    const client = new QueryClient({
      defaultOptions: {
        queries: { meta: { apiBaseUrl: 'http://api' }, retry: false },
        mutations: { retry: 0 },
      },
    })

    renderHook(() => useTokenPolling({ intervalMs: 20, onSessionEnded }), {
      wrapper: wrapperWithClient(client),
    })

    await waitFor(() => expect(authStore.getState().token).toBeNull(), { timeout: 1000 })
    expect(onSessionEnded).toHaveBeenCalled()
  })

  it('does not poll when no token is set and enabled is unspecified', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, {}))
    vi.stubGlobal('fetch', fetchImpl)
    const client = new QueryClient()
    renderHook(() => useTokenPolling({ intervalMs: 20 }), {
      wrapper: wrapperWithClient(client),
    })

    // Give it enough real time that an interval-based call WOULD have fired.
    await new Promise((resolve) => setTimeout(resolve, 80))
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('MdkFetchError exposes the status used by isSessionEnded', () => {
    expect(new MdkFetchError(401, 'x').status).toBe(401)
    expect(new MdkFetchError(500, 'y').status).toBe(500)
  })
})
