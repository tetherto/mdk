import { authStore } from '@tetherto/mdk-ui-foundation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useThingComment } from '../use-thing-comment'

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

const BODY = { rackId: 'rack-0', thingId: 'miner-1', comment: 'psu replaced' }

describe('useThingComment', () => {
  beforeEach(() => {
    authStore.getState().setToken('token')
    authStore.getState().setPermissions({ permissions: ['comments:w'], write: true })
  })
  afterEach(() => {
    authStore.getState().reset()
    vi.unstubAllGlobals()
  })

  it('POSTs a new comment to /auth/thing/comment and invalidates list-things', async () => {
    const fetchSpy = respondWith({ ok: true })
    vi.stubGlobal('fetch', fetchSpy)
    const client = makeClient()
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries')

    const { result } = renderHook(() => useThingComment(), { wrapper: wrapper(client) })
    expect(result.current.canComment).toBe(true)

    await act(async () => {
      await result.current.addComment(BODY)
    })

    const [url, init] = fetchSpy.mock.calls[0]!
    expect(String(url)).toBe('http://api/auth/thing/comment')
    expect((init as RequestInit).method).toBe('POST')
    expect((init as RequestInit).body).toBe(JSON.stringify(BODY))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['auth', 'list-things'] })
  })

  it('edits via PUT and deletes via DELETE with the comment id', async () => {
    const fetchSpy = respondWith({ ok: true })
    vi.stubGlobal('fetch', fetchSpy)

    const { result } = renderHook(() => useThingComment(), { wrapper: wrapper(makeClient()) })

    await act(async () => {
      await result.current.editComment({ ...BODY, id: 'comment-7' })
      await result.current.deleteComment({ ...BODY, id: 'comment-7' })
    })

    const methods = fetchSpy.mock.calls.map((call) => (call[1] as RequestInit).method)
    expect(methods).toEqual(['PUT', 'DELETE'])
  })

  it('reports missing comments:w permission', () => {
    authStore.getState().setPermissions({ permissions: ['alerts:r'], write: false })
    vi.stubGlobal('fetch', respondWith({}))

    const { result } = renderHook(() => useThingComment(), { wrapper: wrapper(makeClient()) })
    expect(result.current.canComment).toBe(false)
  })
})
