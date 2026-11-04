import type { InstalledApp } from '@tetherto/mdk-ui-foundation'

/*
 * Kept apart from mdk-installed-apps.ts, with type-only imports, so its spec
 * runs without the MDK packages built.
 */

export const APPS_ENV = 'MDK_DASHBOARD_APPS'

export type DashboardApp = Omit<InstalledApp, 'ui'> & { dir: string }

/** One plain path segment: the name becomes a URL segment and a build path. */
const APP_NAME = /^[a-z0-9][a-z0-9._-]*$/

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** The apps `mdk run dashboard` passed in, checked enough to serve them safely. */
export const readApps = (raw: string | undefined): DashboardApp[] => {
  if (!raw) return []
  let apps: unknown
  try {
    apps = JSON.parse(raw)
  }
  catch {
    throw new Error(`[mdk-installed-apps] ${APPS_ENV} is not valid JSON`)
  }
  if (!Array.isArray(apps)) throw new Error(`[mdk-installed-apps] ${APPS_ENV} must be a JSON array`)
  return apps.map((app: unknown, i): DashboardApp => {
    if (!isRecord(app)) throw new Error(`[mdk-installed-apps] ${APPS_ENV}[${i}] must be an object`)
    const string = (field: string, { allowEmpty = false } = {}): string => {
      const value = app[field]
      if (typeof value !== 'string' || (value === '' && !allowEmpty)) {
        throw new Error(`[mdk-installed-apps] ${APPS_ENV}[${i}] needs a string "${field}"`)
      }
      return value
    }
    const name = string('name')
    if (!APP_NAME.test(name)) {
      throw new Error(`[mdk-installed-apps] ${APPS_ENV}[${i}]: "${name}" is not a valid app name`)
    }
    return {
      name,
      id: string('id'),
      version: string('version'),
      displayName: string('displayName'),
      // May be empty: the CLI sends '' for an app mounted at `/` (`appApiBase`), whose routes sit
      // at the Gateway root. The list carries no `mount`, so it cannot be narrowed to that one app.
      apiBase: string('apiBase', { allowEmpty: true }),
      dir: string('dir'),
    }
  })
}
