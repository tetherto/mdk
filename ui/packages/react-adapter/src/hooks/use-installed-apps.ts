import {
  appManifestQueryKey,
  fetchAppManifest,
  type InstalledApp,
  type LoadAppManifest,
  MDK_APP_UI_MANIFEST,
} from '@tetherto/mdk-ui-foundation'
import { useQuery } from '@tanstack/react-query'

export type UseInstalledAppsOptions = Partial<{
  /** Disable the lookup. Defaults to on. */
  enabled: boolean
  /** Where the dashboard lists the installed apps. Defaults to `MDK_APP_UI_MANIFEST` (`/app-ui.json`). */
  manifestUrl: string
  /** Reads the app list. Defaults to `fetch` against the page's origin. */
  loadManifest: LoadAppManifest
}>

export type UseInstalledAppsResult = {
  /** Every installed app, with or without a UI, in the dashboard's order. `undefined` until the list loads. */
  apps: InstalledApp[] | undefined
  /** True until the app list has settled. */
  isLoading: boolean
  /** The app list's error. */
  error: unknown
}

/**
 * The apps installed on this stack, as the dashboard lists them from its own
 * origin (`/app-ui.json`, written from the stack's `mdk.yaml` by
 * `mdk run dashboard`). Includes apps that ship no UI, which
 * {@link useInstalledAppUis} leaves out of its loaded list.
 *
 * Apps change only when the dashboard restarts, so the list does not refetch on
 * its own. Every caller with the same `manifestUrl` shares one request.
 *
 * @example
 * ```tsx
 * const { apps } = useInstalledApps()
 * const hasAgent = apps?.some((app) => app.id === 'io.tether.agent') ?? false
 * ```
 * @category apps
 */
export const useInstalledApps = (options: UseInstalledAppsOptions = {}): UseInstalledAppsResult => {
  const manifestUrl = options.manifestUrl ?? MDK_APP_UI_MANIFEST
  const loadManifest = options.loadManifest ?? fetchAppManifest

  const listing = useQuery({
    queryKey: appManifestQueryKey(manifestUrl),
    queryFn: () => loadManifest(manifestUrl),
    enabled: options.enabled ?? true,
    staleTime: Infinity,
    retry: false,
  })

  return { apps: listing.data?.apps, isLoading: listing.isLoading, error: listing.error }
}
