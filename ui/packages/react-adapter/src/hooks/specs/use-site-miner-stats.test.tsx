import { authStore } from '@tetherto/mdk-ui-foundation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSiteMinerStats } from '../use-site-miner-stats'

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

describe('useSiteMinerStats', () => {
  beforeEach(() => {
    authStore.getState().setToken('token')
  })
  afterEach(() => {
    authStore.getState().reset()
    vi.unstubAllGlobals()
  })

  it('projects tail-log aggregates onto the miners box fields', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify([
            [
              {
                ts: 1700000000000,
                hashrate_mhs_1m_cnt_aggr: 216,
                online_or_minor_error_miners_amount_aggr: 158,
                not_mining_miners_amount_aggr: 1,
                offline_or_sleeping_miners_amount_aggr: 57,
              },
            ],
          ]),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
    )
    vi.stubGlobal('fetch', fetchImpl)

    const { result } = renderHook(() => useSiteMinerStats({ refetchInterval: 0 }), {
      wrapper: wrapper(makeClient()),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.mosTotal).toBe(216)
    expect(result.current.online).toBe(158)
    expect(result.current.error).toBe(1)
    expect(result.current.offline).toBe(57)
    expect(String(fetchImpl.mock.calls[0]![0])).toContain('key=stat-rtd')
  })

  it('returns zeros when the response is empty', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify([[]]), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
      ),
    )
    const { result } = renderHook(() => useSiteMinerStats({ refetchInterval: 0 }), {
      wrapper: wrapper(makeClient()),
    })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current).toMatchObject({ mosTotal: 0, online: 0, error: 0, offline: 0 })
  })
})
