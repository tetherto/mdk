import { authStore } from '@tetherto/mdk-ui-foundation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useContainerSettings } from '../use-container-settings'

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

const M56_SETTINGS = {
  model: 'container-bd-d40-m56',
  site: 'Site A',
  parameters: {},
  thresholds: {
    oilTemperature: { criticalLow: 33, alert: 39, normal: 42, alarm: 46, criticalHigh: 48 },
  },
}

describe('useContainerSettings', () => {
  beforeEach(() => {
    authStore.getState().setToken('token')
  })
  afterEach(() => {
    authStore.getState().reset()
    vi.unstubAllGlobals()
  })

  it('fetches containerSettings global data (flat array) and resolves per model', async () => {
    const fetchSpy = respondWith([M56_SETTINGS, { model: 'container-mbt-alpha' }])
    vi.stubGlobal('fetch', fetchSpy)

    const { result } = renderHook(() => useContainerSettings({ refetchInterval: 0 }), {
      wrapper: wrapper(makeClient()),
    })

    await waitFor(() => expect(result.current.settings).toHaveLength(2))
    const url = String(fetchSpy.mock.calls[0]?.[0])
    expect(url).toBe('http://api/auth/global/data?type=containerSettings')

    expect(result.current.settingsForModel('container-bd-d40-m56')).toEqual(M56_SETTINGS)
    expect(result.current.settingsForModel('container-unknown')).toBeUndefined()
  })

  it('narrows to one settings-model via the model option', async () => {
    const fetchSpy = respondWith([M56_SETTINGS])
    vi.stubGlobal('fetch', fetchSpy)

    const { result } = renderHook(
      () => useContainerSettings({ model: 'bd', refetchInterval: 0 }),
      { wrapper: wrapper(makeClient()) },
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    const url = String(fetchSpy.mock.calls[0]?.[0])
    expect(url).toBe('http://api/auth/global/data?type=containerSettings&model=bd')
  })
})
