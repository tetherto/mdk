import { authStore } from '@tetherto/mdk-ui-foundation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useLiveActions } from '../use-live-actions'

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

/**
 * Build a fetch spy that routes by URL:
 * - /auth/userinfo  → userInfoBody
 * - /auth/actions   → actionsBody (wrapped in the array format the hook expects)
 */
const makeRoutedFetch = (userInfoBody: unknown, actionsBody: unknown) =>
  vi.fn(async (url: unknown) => {
    const urlStr = url as string
    const body = urlStr.includes('/auth/userinfo') ? userInfoBody : actionsBody
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  })

describe('useLiveActions', () => {
  beforeEach(() => {
    authStore.getState().setToken('token')
    authStore.getState().setPermissions({ permissions: ['actions:w'], write: true })
  })
  afterEach(() => {
    authStore.getState().reset()
    vi.unstubAllGlobals()
  })

  it('partitions a voting action into myVoting when email matches votesPos[0]', async () => {
    const email = 'operator@mine.io'
    vi.stubGlobal(
      'fetch',
      makeRoutedFetch(
        { metadata: { email } },
        [{ voting: [{ id: 'a1', votesPos: [email], status: 'voting' }], ready: [], executing: [], done: [] }],
      ),
    )

    const { result } = renderHook(() => useLiveActions(), { wrapper: wrapper(makeClient()) })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.myVoting).toHaveLength(1)
    expect(result.current.myVoting[0]!.id).toBe('a1')
    expect(result.current.othersVoting).toHaveLength(0)
  })

  it('partitions a voting action into othersVoting when email differs', async () => {
    const myEmail = 'me@mine.io'
    const otherEmail = 'other@mine.io'
    vi.stubGlobal(
      'fetch',
      makeRoutedFetch(
        { metadata: { email: myEmail } },
        [{ voting: [{ id: 'b1', votesPos: [otherEmail], status: 'voting' }], ready: [], executing: [], done: [] }],
      ),
    )

    const { result } = renderHook(() => useLiveActions(), { wrapper: wrapper(makeClient()) })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.myVoting).toHaveLength(0)
    expect(result.current.othersVoting).toHaveLength(1)
    expect(result.current.othersVoting[0]!.id).toBe('b1')
  })

  it('treats all actions as mine when email is undefined (optimistic fallback)', async () => {
    // /auth/userinfo returns no email fields → useCurrentUserEmail returns undefined
    vi.stubGlobal(
      'fetch',
      makeRoutedFetch(
        {},
        [{ voting: [{ id: 'c1', votesPos: ['unknown@other.io'], status: 'voting' }], ready: [], executing: [], done: [] }],
      ),
    )

    const { result } = renderHook(() => useLiveActions(), { wrapper: wrapper(makeClient()) })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    // Optimistic fallback: no email → all go to myVoting
    expect(result.current.myVoting).toHaveLength(1)
    expect(result.current.othersVoting).toHaveLength(0)
  })

  it('populates myReady, myExecuting, myDone from their respective buckets', async () => {
    const email = 'op@mine.io'
    vi.stubGlobal(
      'fetch',
      makeRoutedFetch(
        { metadata: { email } },
        [{
          voting: [],
          ready: [{ id: 'r1', votesPos: [email], status: 'ready' }],
          executing: [{ id: 'e1', votesPos: [email], status: 'executing' }],
          done: [{ id: 'd1', votesPos: [email], status: 'done' }],
        }],
      ),
    )

    const { result } = renderHook(() => useLiveActions(), { wrapper: wrapper(makeClient()) })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.myReady[0]!.id).toBe('r1')
    expect(result.current.myExecuting[0]!.id).toBe('e1')
    expect(result.current.myDone[0]!.id).toBe('d1')
  })

  it('exposes canApprove=false when actions:w is not set', async () => {
    authStore.getState().setPermissions({ permissions: [] })
    vi.stubGlobal('fetch', makeRoutedFetch({}, [{ voting: [], ready: [], executing: [], done: [] }]))

    const { result } = renderHook(() => useLiveActions(), { wrapper: wrapper(makeClient()) })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.canApprove).toBe(false)
    expect(result.current.othersVoting).toHaveLength(0)
  })

  it('grants canApprove from an admin role in the token (no permissions populated)', async () => {
    // No permissions set, but the token carries roles:admin — matches the
    // real app, which never populates authStore.permissions.
    authStore.getState().setToken('pub:api:abc-roles:admin')
    authStore.getState().setPermissions(null)
    const myEmail = 'me@mine.io'
    const otherEmail = 'other@mine.io'
    vi.stubGlobal(
      'fetch',
      makeRoutedFetch(
        { metadata: { email: myEmail } },
        [{ voting: [{ id: 'a1', votesPos: [otherEmail], status: 'voting' }], ready: [], executing: [], done: [] }],
      ),
    )

    const { result } = renderHook(() => useLiveActions(), { wrapper: wrapper(makeClient()) })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.canApprove).toBe(true)
    expect(result.current.othersVoting).toHaveLength(1)
    expect(result.current.othersVoting[0]!.id).toBe('a1')
  })

  it('grants canApprove from the wildcard role in the token', async () => {
    authStore.getState().setToken('pub:api:abc-roles:*')
    authStore.getState().setPermissions(null)
    vi.stubGlobal('fetch', makeRoutedFetch({}, [{ voting: [], ready: [], executing: [], done: [] }]))

    const { result } = renderHook(() => useLiveActions(), { wrapper: wrapper(makeClient()) })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.canApprove).toBe(true)
  })
})
