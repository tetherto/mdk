import type { InstalledApp, InstalledAppsResponse } from '@tetherto/mdk-ui-foundation'
import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { createMdkHarness } from '@/test-utils/mdk-harness'
import { useInstalledAppUis } from '../use-installed-app-uis'
import { useInstalledApps } from '../use-installed-apps'

const app = (name: string, ui: InstalledApp['ui'] = null): InstalledApp => ({
  name,
  id: `io.tether.${name}`,
  version: '0.1.0',
  displayName: name,
  apiBase: `/apps/${name}`,
  ui,
})

const manifest = (apps: InstalledApp[]) =>
  vi.fn(async (_url: string): Promise<InstalledAppsResponse> => ({ apps }))

describe('useInstalledApps', () => {
  it('lists every installed app, the ones without a UI included', async () => {
    const harness = createMdkHarness()
    const loadManifest = manifest([app('agent'), app('sentinel')])
    const { result } = renderHook(() => useInstalledApps({ loadManifest }), {
      wrapper: harness.Wrapper,
    })

    expect(result.current.apps).toBeUndefined()
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(loadManifest).toHaveBeenCalledWith('/app-ui.json')
    expect(result.current.apps?.map((a) => a.id)).toEqual(['io.tether.agent', 'io.tether.sentinel'])
    expect(result.current.error).toBeNull()
  })

  it('shares one request with useInstalledAppUis', async () => {
    const harness = createMdkHarness()
    const loadManifest = manifest([app('agent')])
    const { result } = renderHook(
      () => ({
        installed: useInstalledApps({ loadManifest }),
        uis: useInstalledAppUis({ loadManifest, importModule: vi.fn() }),
      }),
      { wrapper: harness.Wrapper },
    )

    await waitFor(() => expect(result.current.uis.isLoading).toBe(false))
    expect(result.current.installed.apps?.map((a) => a.id)).toEqual(['io.tether.agent'])
    expect(loadManifest).toHaveBeenCalledTimes(1)
  })

  it('surfaces an app-list failure as `error`', async () => {
    const harness = createMdkHarness()
    const loadManifest = vi.fn(async (): Promise<InstalledAppsResponse> => {
      throw new Error('no app list')
    })
    const { result } = renderHook(() => useInstalledApps({ loadManifest }), {
      wrapper: harness.Wrapper,
    })

    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(result.current.apps).toBeUndefined()
    expect(result.current.isLoading).toBe(false)
  })

  it('does nothing while disabled', () => {
    const harness = createMdkHarness()
    const loadManifest = manifest([])
    const { result } = renderHook(() => useInstalledApps({ enabled: false, loadManifest }), {
      wrapper: harness.Wrapper,
    })

    expect(result.current.isLoading).toBe(false)
    expect(loadManifest).not.toHaveBeenCalled()
  })
})
