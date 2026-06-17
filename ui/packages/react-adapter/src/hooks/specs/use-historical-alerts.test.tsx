import { authStore, ONE_DAY_MS } from '@tetherto/mdk-ui-core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useHistoricalAlerts } from '../use-historical-alerts'

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

const alertRow = (uuid: string) => ({
  uuid,
  name: 'temp_high',
  description: 'hot',
  severity: 'warning',
  createdAt: 1,
  thing: { id: 'miner-1', type: 'miner' },
})

describe('useHistoricalAlerts', () => {
  beforeEach(() => {
    authStore.getState().setToken('token')
  })

  afterEach(() => {
    authStore.getState().reset()
    vi.unstubAllGlobals()
  })

  it('fetches the whole range in a single request by default', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify([[alertRow('only')]]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    )
    vi.stubGlobal('fetch', fetchImpl)

    const { result } = renderHook(
      () => useHistoricalAlerts({ start: 0, end: 5 * ONE_DAY_MS }),
      { wrapper: wrapper(makeClient()) },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    // One request for the full 5-day range — no per-day fan-out.
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const url = fetchImpl.mock.calls[0]![0] as string
    expect(url).toContain('/auth/history-log?')
    expect(url).toContain('logType=alerts')
  })

  it('fans out into per-window requests when intervalMs is set (opt-in)', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      // Return a distinct row per window so we can assert the merge.
      const start = new URL(url).searchParams.get('start')
      return new Response(JSON.stringify([[alertRow(`u-${start}`)]]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetchImpl)

    const { result } = renderHook(
      () => useHistoricalAlerts({ start: 0, end: 2 * ONE_DAY_MS, intervalMs: ONE_DAY_MS }),
      { wrapper: wrapper(makeClient()) },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(result.current.data).toHaveLength(2)
  })

  it('maps rows through mapHistoryLogToAlerts (thing preserved)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify([[alertRow('a1')]]), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
      ),
    )
    const { result } = renderHook(() => useHistoricalAlerts({ start: 0, end: ONE_DAY_MS }), {
      wrapper: wrapper(makeClient()),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.[0]).toMatchObject({
      uuid: 'a1',
      severity: 'warning',
      thing: { id: 'miner-1', type: 'miner' },
    })
  })

  it('does not fetch when the range is invalid', async () => {
    const fetchImpl = vi.fn()
    vi.stubGlobal('fetch', fetchImpl)
    const { result } = renderHook(() => useHistoricalAlerts({ start: 100, end: 100 }), {
      wrapper: wrapper(makeClient()),
    })
    // Disabled query stays in pending/idle and never fetches.
    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'))
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('honours an explicit enabled=false even for a valid range', async () => {
    const fetchImpl = vi.fn()
    vi.stubGlobal('fetch', fetchImpl)
    const { result } = renderHook(
      () => useHistoricalAlerts({ start: 0, end: ONE_DAY_MS, enabled: false }),
      { wrapper: wrapper(makeClient()) },
    )
    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'))
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('tolerates a flat (non-nested) history-log body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          // Flat array — not wrapped in the worker-grouping envelope.
          new Response(JSON.stringify([alertRow('flat')]), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
      ),
    )
    const { result } = renderHook(() => useHistoricalAlerts({ start: 0, end: ONE_DAY_MS }), {
      wrapper: wrapper(makeClient()),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.[0]).toMatchObject({ uuid: 'flat' })
  })

  it('treats a non-array body as no rows', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ unexpected: 'shape' }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
      ),
    )
    const { result } = renderHook(() => useHistoricalAlerts({ start: 0, end: ONE_DAY_MS }), {
      wrapper: wrapper(makeClient()),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })
})
