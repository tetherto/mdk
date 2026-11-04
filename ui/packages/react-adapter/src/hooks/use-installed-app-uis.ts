import { appUisQueryKey } from '@tetherto/mdk-ui-foundation'
import { useQuery } from '@tanstack/react-query'

import { loadAppUis } from '../apps/load-app-ui'
import type { AppUiLoadFailure, ImportAppModule, LoadedAppUi } from '../apps/types'
import { useInstalledApps, type UseInstalledAppsOptions } from './use-installed-apps'

export type UseInstalledAppUisOptions = UseInstalledAppsOptions & {
  /** Module importer for the app entries. Defaults to the browser's dynamic `import()`. */
  importModule?: ImportAppModule
}

export type UseInstalledAppUisResult = {
  /** Apps whose UI loaded and passed the contract check, in the dashboard's order. */
  apps: LoadedAppUi[]
  /** Apps whose UI did not load, each with the reason. Never blocks `apps`. */
  failures: AppUiLoadFailure[]
  /** True until the app list and every UI it names have settled. */
  isLoading: boolean
  /** The app list's own error; per-app errors are in `failures`. */
  error: unknown
}

const EMPTY: { loaded: LoadedAppUi[]; failures: AppUiLoadFailure[] } = { loaded: [], failures: [] }

/**
 * The installed apps' UIs, ready for a dashboard to mount: reads the app list
 * the dashboard serves from its own origin (`/app-ui.json`, written from the
 * stack's `mdk.yaml` by `mdk run dashboard`), imports each app's
 * `ui/index.js`, checks it against the app UI contract and adds its
 * stylesheets to the page. Finding the apps needs no Gateway.
 *
 * Installing an app therefore needs no change to the dashboard: restart it,
 * and the app's pages and panels are here. An app whose UI fails to load lands
 * in `failures` instead of taking the dashboard down with it.
 *
 * Apps change only when the dashboard restarts, so neither the list nor the
 * loaded modules refetch on their own.
 *
 * @remarks
 * App entries are plain ES modules importing React and the MDK packages by bare
 * specifier; the dashboard must map those (`MDK_APP_SHARED_MODULES`) to its own
 * instances with an import map, or the imports fail to resolve.
 *
 * @example
 * ```tsx
 * const { apps } = useInstalledAppUis()
 * const items = apps.flatMap(({ app, ui }) => ui.routes.filter((r) => !r.hidden).map(...))
 * ```
 * @category apps
 */
export const useInstalledAppUis = (
  options: UseInstalledAppUisOptions = {},
): UseInstalledAppUisResult => {
  const enabled = options.enabled ?? true
  const listing = useInstalledApps(options)

  const installed = listing.apps
  const uis = useQuery({
    queryKey: appUisQueryKey(installed),
    queryFn: () => loadAppUis(installed ?? [], { importModule: options.importModule }),
    enabled: enabled && installed !== undefined,
    staleTime: Infinity,
    retry: false,
  })

  const { loaded, failures } = uis.data ?? EMPTY

  return {
    apps: loaded,
    failures,
    isLoading: enabled && (listing.isLoading || (installed !== undefined && uis.isLoading)),
    error: listing.error,
  }
}
