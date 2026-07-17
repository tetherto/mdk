import { authStore } from '@tetherto/mdk-ui-foundation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useCabinetGroups } from '../use-cabinet-groups'

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

describe('useCabinetGroups', () => {
  beforeEach(() => {
    authStore.getState().setToken('token')
  })
  afterEach(() => {
    authStore.getState().reset()
    vi.unstubAllGlobals()
  })

  it('groups cabinet devices by owning container with site-level devices last', async () => {
    const fetchSpy = respondWith([
      [
        { id: 'pm-1', type: 'powermeter-abb-b23', info: { container: 'bitdeer-1a' } },
        { id: 'pm-site', type: 'powermeter-satec-pm180', info: { pos: 'site' } },
        { id: 'sensor-1', type: 'sensor-temp-seneca', info: { container: 'bitdeer-1a' } },
        { id: 'pm-2', type: 'powermeter-abb-b23', info: { container: 'antspace-2b' } },
      ],
    ])
    vi.stubGlobal('fetch', fetchSpy)

    const { result } = renderHook(() => useCabinetGroups({ refetchInterval: 0 }), {
      wrapper: wrapper(makeClient()),
    })

    await waitFor(() => expect(result.current.groups).toHaveLength(3))
    expect(result.current.groups.map((group) => group.container)).toEqual([
      'antspace-2b',
      'bitdeer-1a',
      'site',
    ])
    expect(result.current.groups[1]?.devices.map((device) => device.id)).toEqual([
      'pm-1',
      'sensor-1',
    ])
  })

  it('returns no groups for an empty cabinet list', async () => {
    vi.stubGlobal('fetch', respondWith([[]]))

    const { result } = renderHook(() => useCabinetGroups({ refetchInterval: 0 }), {
      wrapper: wrapper(makeClient()),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.groups).toEqual([])
  })
})
