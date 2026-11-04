/**
 * The installed-app contract between a dashboard and the app UIs it loads.
 *
 * An MDK app ships its UI as a built ES module (`ui/index.js` in the app
 * package). `mdk run dashboard` reads the installed apps from `mdk.yaml`; the
 * dashboard serves each app's `ui/` and lists the apps at
 * {@link MDK_APP_UI_MANIFEST}, both from its own origin. On load it reads that
 * list and imports each app's entry, so installing an app never means editing
 * the dashboard, and finding the apps needs no Gateway.
 *
 * Framework-agnostic on purpose: what an app's module exports is React and lives
 * in `@tetherto/mdk-react-adapter`; this is only the app list and which modules
 * a dashboard lends to the apps it loads.
 *
 * @category apps
 */

export { MDK_APP_SHARED_MODULES, type MdkAppSharedModule } from './shared-modules.js'
export { MDK_APP_UI_BASE, MDK_APP_UI_MANIFEST } from './ui-paths.js'

/**
 * Where an app's UI is served: its entry module, and the stylesheets its build
 * emitted beside it, which the shell adds to the page before mounting the app.
 *
 * @category apps
 */
export type InstalledAppUi = {
  /** URL of the app's built entry module, e.g. `/app-ui/sentinel/index.js`. */
  entry: string
  /** URLs of the stylesheets shipped beside the entry. */
  styles: string[]
}

/**
 * One installed app, as the dashboard lists it.
 *
 * @category apps
 */
export type InstalledApp = {
  /** Installed name — the operator's handle, unique per stack, and the `/apps/<name>` segment. */
  name: string
  /** Immutable reverse-DNS identity from the app's `mdk-app.yaml`, e.g. `io.tether.sentinel`. */
  id: string
  /** Installed version (semver). */
  version: string
  /** Human name, shown in the shell's sidebar. */
  displayName: string
  /** Prefix of the app's own API routes on the Gateway, e.g. `/apps/sentinel`. */
  apiBase: string
  /** The app's UI, or `null` for an app that ships none. */
  ui: InstalledAppUi | null
}

/**
 * Body of the dashboard's app list ({@link MDK_APP_UI_MANIFEST}).
 *
 * @category apps
 */
export type InstalledAppsResponse = {
  apps: InstalledApp[]
}

/**
 * Reads the dashboard's app list from a URL.
 *
 * @category apps
 */
export type LoadAppManifest = (url: string) => Promise<InstalledAppsResponse>

/**
 * Query key for the dashboard's app list at `url`.
 *
 * @category apps
 */
export const appManifestQueryKey = (url: string) => ['apps', 'manifest', url] as const

/**
 * Query key for the loaded UIs of the apps in a list: keyed by what was
 * installed, so a different list (or a new version of an app) loads afresh.
 *
 * @category apps
 */
export const appUisQueryKey = (apps: InstalledApp[] | undefined) =>
  [
    'apps',
    'ui',
    apps?.map((app) => [app.name, app.id, app.version, app.ui?.entry ?? null]),
  ] as const

/**
 * Fetches the dashboard's app list (default {@link MDK_APP_UI_MANIFEST}) from
 * the page's own origin. It is a static file the dashboard serves, so the
 * request carries no Gateway base URL and no auth.
 *
 * @category apps
 */
export const fetchAppManifest: LoadAppManifest = async (url) => {
  const res = await fetch(url, { headers: { accept: 'application/json' } })
  if (!res.ok) throw new Error(`Could not read the installed apps from ${url} (HTTP ${res.status})`)
  return (await res.json()) as InstalledAppsResponse
}
