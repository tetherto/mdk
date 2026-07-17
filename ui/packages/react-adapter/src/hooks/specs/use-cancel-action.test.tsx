import { authStore } from '@tetherto/mdk-ui-foundation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useCancelAction } from '../use-cancel-action'

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

describe('useCancelAction', () => {
  beforeEach(() => {
    authStore.getState().setToken('token')
    authStore.getState().setPermissions({ permissions: ['actions:w'], write: true })
  })
  afterEach(() => {
    authStore.getState().reset()
    vi.unstubAllGlobals()
  })

  it('DELETEs the default voting type with comma-joined ids', async () => {
    const fetchSpy = respondWith({ ok: true })
    vi.stubGlobal('fetch', fetchSpy)

    const { result } = renderHook(() => useCancelAction(), { wrapper: wrapper(makeClient()) })

    expect(result.current.canCancel).toBe(true)

    await act(async () => {
      await result.current.cancel({ ids: ['a', 'b'] })
    })

    const [url, init] = fetchSpy.mock.calls[0]!
    expect(url).toBe('http://api/auth/actions/voting/cancel?ids=a%2Cb')
    expect((init as RequestInit).method).toBe('DELETE')
  })

  it('invalidates pool/miner/actions caches and refetches live actions after a cancel', async () => {
    vi.stubGlobal('fetch', respondWith({ ok: true }))
    const client = makeClient()
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries').mockResolvedValue()
    const refetchSpy = vi.spyOn(client, 'refetchQueries').mockResolvedValue()

    const { result } = renderHook(() => useCancelAction(), { wrapper: wrapper(client) })

    await act(async () => {
      await result.current.cancel({ ids: ['a', 'b'] })
    })

    const invalidatedKeys = invalidateSpy.mock.calls.map(([arg]) => (arg as { queryKey: unknown }).queryKey)
    expect(invalidatedKeys).toContainEqual(['auth', 'configs', 'pool'])
    expect(invalidatedKeys).toContainEqual(['auth', 'miners'])
    expect(invalidatedKeys).toContainEqual(['auth', 'pools'])
    expect(invalidatedKeys).toContainEqual(['auth', 'actions'])
    expect(refetchSpy).toHaveBeenCalledWith({ queryKey: ['auth', 'actions', 'live'] })
  })
})
