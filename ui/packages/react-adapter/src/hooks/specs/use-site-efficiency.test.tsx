import { authStore } from '@tetherto/mdk-ui-foundation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSiteEfficiency } from '../use-site-efficiency'

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

describe('useSiteEfficiency', () => {
  beforeEach(() => {
    authStore.getState().setToken('token')
  })
  afterEach(() => {
    authStore.getState().reset()
    vi.unstubAllGlobals()
  })

  it('derives W/TH/s from the latest samples of both upstream hooks', async () => {
    // hashrate response — 1 EH/s = 1e9 MH/s; let's pick 2e9 MH/s = 2 PH/s = 2000 TH/s
    // consumption — 52,580 W (so W/TH/s = 52580 / 2000 = 26.29)
    const fetchImpl = vi.fn(async (url: unknown) => {
      const str = String(url)
      if (str.includes('hashrate_mhs_1m_sum_aggr')) {
        return new Response(
          JSON.stringify([[{ ts: 1, hashrate_mhs_1m_sum_aggr: 2_000_000_000 }]]),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        )
      }
      return new Response(JSON.stringify([[{ ts: 1, power_w_sum_aggr: 52_580 }]]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetchImpl)

    const { result } = renderHook(() => useSiteEfficiency({ timeline: '5m', refetchInterval: 0 }), {
      wrapper: wrapper(makeClient()),
    })
    await waitFor(() => expect(result.current.valueWthS).toBeDefined())
    expect(result.current.valueWthS).toBeCloseTo(26.29, 2)
  })

  it('returns undefined when either input is missing', async () => {
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
    const { result } = renderHook(() => useSiteEfficiency({ timeline: '5m', refetchInterval: 0 }), {
      wrapper: wrapper(makeClient()),
    })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.valueWthS).toBeUndefined()
  })

  it('uses the powerW override instead of the consumption hook when provided', async () => {
    // hashrate returns 2_000_000_000 MH/s = 2000 TH/s; consumption (ignored) returns 52,580 W
    // override powerW = 1_663_000 (the site powermeter value) -> 1_663_000 / 2000 = 831.5 W/TH/s
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: unknown) => {
        const str = String(url)
        if (str.includes('hashrate_mhs_1m_sum_aggr')) {
          return new Response(
            JSON.stringify([[{ ts: 1, hashrate_mhs_1m_sum_aggr: 2_000_000_000 }]]),
            { status: 200, headers: { 'content-type': 'application/json' } },
          )
        }
        return new Response(JSON.stringify([[{ ts: 1, power_w_sum_aggr: 52_580 }]]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }),
    )

    const { result } = renderHook(
      () => useSiteEfficiency({ timeline: '5m', refetchInterval: 0, powerW: 1_663_000 }),
      { wrapper: wrapper(makeClient()) },
    )
    await waitFor(() => expect(result.current.valueWthS).toBeDefined())
    expect(result.current.valueWthS).toBeCloseTo(831.5, 1)
  })
})
