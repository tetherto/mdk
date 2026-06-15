import { authStore } from '@tetherto/mdk-ui-core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSiteConsumption } from '../use-site-consumption'

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

const respond = (body: unknown) =>
  vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
  )

describe('useSiteConsumption', () => {
  beforeEach(() => {
    authStore.getState().setToken('token')
  })
  afterEach(() => {
    authStore.getState().reset()
    vi.unstubAllGlobals()
  })

  it('returns the freshest watts converted to MW', async () => {
    vi.stubGlobal(
      'fetch',
      respond([
        [
          { ts: 1, power_w_sum_aggr: 1_500_000 },
          { ts: 2, power_w_sum_aggr: 1_663_000 },
        ],
      ]),
    )
    const { result } = renderHook(
      () => useSiteConsumption({ timeline: '5m', refetchInterval: 0 }),
      { wrapper: wrapper(makeClient()) },
    )
    await waitFor(() => expect(result.current.valueW).toBe(1_663_000))
    expect(result.current.valueMw).toBeCloseTo(1.663, 3)
  })

  it('honors a custom powerAttribute', async () => {
    vi.stubGlobal('fetch', respond([[{ ts: 1, power_w_aggr: 5_000_000 }]]))
    const { result } = renderHook(
      () =>
        useSiteConsumption({
          timeline: '5m',
          powerAttribute: 'power_w_aggr',
          refetchInterval: 0,
        }),
      { wrapper: wrapper(makeClient()) },
    )
    await waitFor(() => expect(result.current.valueW).toBe(5_000_000))
    expect(result.current.valueMw).toBe(5)
  })

  it('returns undefined when no samples arrive', async () => {
    vi.stubGlobal('fetch', respond([[]]))
    const { result } = renderHook(
      () => useSiteConsumption({ timeline: '5m', refetchInterval: 0 }),
      { wrapper: wrapper(makeClient()) },
    )
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.valueMw).toBeUndefined()
  })
})
