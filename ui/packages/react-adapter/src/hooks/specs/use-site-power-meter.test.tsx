import { authStore } from '@tetherto/mdk-ui-foundation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSitePowerMeter } from '../use-site-power-meter'

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

describe('useSitePowerMeter', () => {
  beforeEach(() => {
    authStore.getState().setToken('token')
  })
  afterEach(() => {
    authStore.getState().reset()
    vi.unstubAllGlobals()
  })

  it('reads power_w from a device tagged t-powermeter and converts to MW', async () => {
    vi.stubGlobal(
      'fetch',
      respondWith([
        [
          {
            id: 'pm-1',
            tags: ['t-powermeter', 'site'],
            last: { snap: { stats: { power_w: 1_663_000 } } },
          },
        ],
      ]),
    )
    const { result } = renderHook(() => useSitePowerMeter({ refetchInterval: 0 }), {
      wrapper: wrapper(makeClient()),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.valueW).toBe(1_663_000)
    expect(result.current.valueMw).toBeCloseTo(1.663, 6)
  })

  it('sums across multiple powermeters when present', async () => {
    vi.stubGlobal(
      'fetch',
      respondWith([
        [
          { id: 'pm-1', tags: ['t-powermeter'], last: { snap: { stats: { power_w: 800_000 } } } },
          { id: 'pm-2', tags: ['t-powermeter'], last: { snap: { stats: { power_w: 863_000 } } } },
        ],
      ]),
    )
    const { result } = renderHook(() => useSitePowerMeter({ refetchInterval: 0 }), {
      wrapper: wrapper(makeClient()),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.valueW).toBe(1_663_000)
  })

  it('falls back to devices tagged t-container when no powermeter is present', async () => {
    vi.stubGlobal(
      'fetch',
      respondWith([
        [
          {
            id: 'c-1',
            tags: ['t-container'],
            last: { snap: { stats: { power_w: 421_330 } } },
          },
        ],
      ]),
    )
    const { result } = renderHook(() => useSitePowerMeter({ refetchInterval: 0 }), {
      wrapper: wrapper(makeClient()),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.valueW).toBe(421_330)
  })

  it('returns undefined when no device reports power_w', async () => {
    vi.stubGlobal('fetch', respondWith([[]]))
    const { result } = renderHook(() => useSitePowerMeter({ refetchInterval: 0 }), {
      wrapper: wrapper(makeClient()),
    })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.valueW).toBeUndefined()
    expect(result.current.valueMw).toBeUndefined()
  })
})
