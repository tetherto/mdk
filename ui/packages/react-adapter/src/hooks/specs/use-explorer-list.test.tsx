import { authStore, EXPLORER_TAB } from '@tetherto/mdk-ui-foundation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useExplorerList } from '../use-explorer-list'

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

describe('useExplorerList', () => {
  beforeEach(() => {
    authStore.getState().setToken('token')
  })
  afterEach(() => {
    authStore.getState().reset()
    vi.unstubAllGlobals()
  })

  it('fetches container-tab things and flattens the per-kernel envelope', async () => {
    const fetchSpy = respondWith([
      [{ id: 'c-1', type: 'container-bd-d40-m56' }],
      [{ id: 'c-2', type: 'container-bd-d40-s19xp' }],
    ])
    vi.stubGlobal('fetch', fetchSpy)

    const { result } = renderHook(
      () => useExplorerList(EXPLORER_TAB.CONTAINER, { refetchInterval: 0 }),
      { wrapper: wrapper(makeClient()) },
    )

    await waitFor(() => expect(result.current.things).toHaveLength(2))
    const url = new URL(String(fetchSpy.mock.calls[0]?.[0]))
    expect(url.pathname).toBe('/auth/list-things')
    expect(JSON.parse(url.searchParams.get('query') ?? '')).toEqual({
      tags: { $in: ['t-container'] },
    })
    expect(url.searchParams.get('status')).toBe('1')
    expect(url.searchParams.get('fields')).toBeTruthy()
  })

  it('unions powermeter and sensor tags for the cabinet tab', async () => {
    const fetchSpy = respondWith([[]])
    vi.stubGlobal('fetch', fetchSpy)

    const { result } = renderHook(
      () => useExplorerList(EXPLORER_TAB.CABINET, { refetchInterval: 0 }),
      { wrapper: wrapper(makeClient()) },
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    const url = new URL(String(fetchSpy.mock.calls[0]?.[0]))
    expect(JSON.parse(url.searchParams.get('query') ?? '')).toEqual({
      tags: { $in: ['t-powermeter', 't-sensor'] },
    })
  })
})
