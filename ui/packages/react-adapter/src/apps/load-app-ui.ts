import type { InstalledApp } from '@tetherto/mdk-ui-foundation'

import type {
  AppUiLoadFailure,
  ImportAppModule,
  LoadedAppUi,
  MdkAppPanel,
  MdkAppRoute,
  MdkAppSection,
  MdkAppUiModule,
} from './types'

/**
 * Types an app's UI entry. Returns its argument: the point is the compile-time
 * check, so an app author finds a contract mistake in their editor rather than
 * as a load failure in someone's shell.
 *
 * ```tsx
 * // ui-src/index.tsx, built to ui/index.js
 * export default defineMdkApp({
 *   id: 'io.tether.sentinel',
 *   displayName: 'Sentinel',
 *   routes: [{ path: '', component: Overview }],
 *   panels: [{ id: 'drift', slot: 'home', component: DriftCard }],
 * })
 * ```
 *
 * @category apps
 */
export const defineMdkApp = (ui: MdkAppUiModule): MdkAppUiModule => ui

/** `import()` that a bundler leaves alone: the URL is only known at runtime. */
const browserImport: ImportAppModule = (url) => import(/* @vite-ignore */ url)

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object'

// A React component is a function, or an exotic object (`memo`, `forwardRef`,
// `lazy`) carrying React's `$$typeof` marker.
const isComponent = (value: unknown): boolean =>
  typeof value === 'function' || (isRecord(value) && '$$typeof' in value)

const contractError = (app: InstalledApp, problem: string): Error =>
  new Error(`App "${app.name}" (${app.id}): ui/index.js ${problem}`)

const checkRoutes = (app: InstalledApp, routes: unknown): MdkAppRoute[] => {
  if (!Array.isArray(routes)) throw contractError(app, 'must export `routes` as an array')
  routes.forEach((route: unknown, i) => {
    if (!isRecord(route) || typeof route.path !== 'string') {
      throw contractError(app, `routes[${i}] needs a string \`path\``)
    }
    if (!isComponent(route.component)) {
      throw contractError(app, `routes[${i}] ("${route.path}") needs a React \`component\``)
    }
    if (route.section !== undefined && (typeof route.section !== 'string' || !route.section)) {
      throw contractError(
        app,
        `routes[${i}] ("${route.path}") has a \`section\` that is not a non-empty string`,
      )
    }
  })
  return routes as MdkAppRoute[]
}

const checkPanels = (app: InstalledApp, panels: unknown): MdkAppPanel[] => {
  if (!Array.isArray(panels)) throw contractError(app, 'must export `panels` as an array')
  const ids = new Set<string>()
  panels.forEach((panel: unknown, i) => {
    if (!isRecord(panel) || typeof panel.id !== 'string' || !panel.id) {
      throw contractError(app, `panels[${i}] needs a string \`id\``)
    }
    if (ids.has(panel.id)) throw contractError(app, `has two panels with id "${panel.id}"`)
    ids.add(panel.id)
    if (typeof panel.slot !== 'string' || !panel.slot) {
      throw contractError(app, `panel "${panel.id}" needs a string \`slot\``)
    }
    if (!isComponent(panel.component)) {
      throw contractError(app, `panel "${panel.id}" needs a React \`component\``)
    }
  })
  return panels as MdkAppPanel[]
}

const checkSections = (app: InstalledApp, sections: unknown): MdkAppSection[] => {
  if (sections === undefined) return []
  if (!Array.isArray(sections)) throw contractError(app, 'must export `sections` as an array')
  const labels = new Set<string>()
  sections.forEach((section: unknown, i) => {
    if (!isRecord(section) || typeof section.label !== 'string' || !section.label) {
      throw contractError(app, `sections[${i}] needs a string \`label\``)
    }
    if (labels.has(section.label)) {
      throw contractError(app, `has two sections labelled "${section.label}"`)
    }
    labels.add(section.label)
    if (section.icon !== undefined && !isComponent(section.icon)) {
      throw contractError(
        app,
        `section "${section.label}" has an \`icon\` that is not a React component`,
      )
    }
  })
  return sections as MdkAppSection[]
}

/**
 * Checks a module an app's entry resolved to against {@link MdkAppUiModule}.
 * Throws an `Error` naming the app and the first thing wrong.
 *
 * @category apps
 */
export const checkAppUiModule = (app: InstalledApp, mod: unknown): MdkAppUiModule => {
  const ui = isRecord(mod) ? mod.default : undefined
  if (!isRecord(ui)) throw contractError(app, 'must default-export the app UI object')
  if (ui.id !== app.id) {
    throw contractError(app, `declares id "${String(ui.id)}", but the installed app is "${app.id}"`)
  }
  if (typeof ui.displayName !== 'string' || !ui.displayName) {
    throw contractError(app, 'must export a non-empty `displayName`')
  }
  return {
    id: ui.id,
    displayName: ui.displayName,
    routes: checkRoutes(app, ui.routes),
    panels: checkPanels(app, ui.panels),
    sections: checkSections(app, ui.sections),
  }
}

/**
 * Adds an app's stylesheets to the document, once each, ahead of its first
 * render. Tagged with the app's name so a shell can find them again.
 */
const attachStyles = (app: InstalledApp, hrefs: string[]): void => {
  if (typeof document === 'undefined') return
  for (const href of hrefs) {
    const exists = Array.from(
      document.querySelectorAll<HTMLLinkElement>('link[data-mdk-app]'),
    ).some((link) => link.getAttribute('href') === href)
    if (exists) continue
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    link.dataset.mdkApp = app.name
    document.head.append(link)
  }
}

export type LoadAppUiOptions = {
  /**
   * Module importer. Defaults to the browser's dynamic `import()`. App entries
   * and stylesheets are paths on the dashboard's own origin, so they load
   * relative to the page.
   */
  importModule?: ImportAppModule
}

/**
 * Imports one installed app's UI entry, checks it, and attaches its styles.
 * Rejects with the reason the app cannot be shown.
 *
 * @category apps
 */
export const loadAppUi = async (
  app: InstalledApp,
  { importModule = browserImport }: LoadAppUiOptions = {},
): Promise<LoadedAppUi> => {
  if (!app.ui) throw new Error(`App "${app.name}" (${app.id}) ships no UI`)

  let mod: unknown
  try {
    mod = await importModule(app.ui.entry)
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : String(cause)
    throw new Error(`App "${app.name}" (${app.id}): could not load ${app.ui.entry}: ${reason}`, {
      cause,
    })
  }

  const ui = checkAppUiModule(app, mod)
  attachStyles(app, app.ui.styles)
  return { app, ui }
}

/**
 * Loads every installed app that ships a UI, independently: the result holds
 * the ones that loaded and, separately, why each other one did not.
 *
 * @category apps
 */
export const loadAppUis = async (
  apps: InstalledApp[],
  options?: LoadAppUiOptions,
): Promise<{ loaded: LoadedAppUi[]; failures: AppUiLoadFailure[] }> => {
  const withUi = apps.filter((app) => app.ui !== null)
  const settled = await Promise.allSettled(withUi.map((app) => loadAppUi(app, options)))

  const loaded: LoadedAppUi[] = []
  const failures: AppUiLoadFailure[] = []
  settled.forEach((result, i) => {
    const app = withUi[i]!
    if (result.status === 'fulfilled') loaded.push(result.value)
    else {
      failures.push({
        app,
        error: result.reason instanceof Error ? result.reason : new Error(String(result.reason)),
      })
    }
  })
  return { loaded, failures }
}
