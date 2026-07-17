import { authStore } from '@tetherto/mdk-ui-foundation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useMinerDevices } from '../use-miner-devices'

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

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })

describe('useMinerDevices', () => {
  beforeEach(() => {
    authStore.getState().setToken('token')
  })
  afterEach(() => {
    authStore.getState().reset()
    vi.unstubAllGlobals()
  })

  it('fetches nested t-miner devices from list-things and unwraps the head array', async () => {
    const fetchMock = vi.fn(async (input: unknown) => {
      const url = String(input)
      expect(url).toContain('/auth/list-things')
      expect(url).toContain('t-miner')
      return json([
        [
          {
            id: 'miner-1',
            code: 'AAAA-BBBB',
            tags: ['t-miner'],
            info: { container: 'c1', poolConfig: 'pool-1' },
            last: { ts: 1700, snap: { stats: { status: 'mining', hashrate_mhs: { t_5m: 42 } } } },
          },
        ],
      ])
    })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useMinerDevices({ refetchInterval: 0 }), {
      wrapper: wrapper(makeClient()),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.data).toHaveLength(1)
    expect(result.current.data[0]).toMatchObject({
      id: 'miner-1',
      info: { container: 'c1', poolConfig: 'pool-1' },
    })
  })

  it('uses getListQuery and encodes searchTags when provided', async () => {
    const fetchMock = vi.fn(async () => json([[{ id: 'filtered-miner' }]]))
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(
      () => useMinerDevices({ searchTags: ['some-tag'], refetchInterval: 0 }),
      { wrapper: wrapper(makeClient()) },
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    const calledUrl = String(fetchMock.mock.calls[0]![0])
    expect(calledUrl).toContain('/auth/list-things')
    expect(result.current.data).toHaveLength(1)
  })

  it('returns empty array when the response outer array is empty', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json([[]])))

    const { result } = renderHook(() => useMinerDevices({ refetchInterval: 0 }), {
      wrapper: wrapper(makeClient()),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toEqual([])
  })

  it('does not fetch when enabled is false', () => {
    vi.stubGlobal('fetch', vi.fn())

    const { result } = renderHook(() => useMinerDevices({ enabled: false }), {
      wrapper: wrapper(makeClient()),
    })

    expect(result.current.isLoading).toBe(false)
    expect(vi.mocked(fetch)).not.toHaveBeenCalled()
  })
})
