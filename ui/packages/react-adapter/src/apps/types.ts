import type { InstalledApp } from '@tetherto/mdk-ui-foundation'
import type { ComponentType } from 'react'

/**
 * One page an app adds to the shell.
 *
 * The shell mounts an app's pages under its own prefix for that app, so `path`
 * is relative: `''` is the app's landing page, `'drift/:minerId'` a deep link
 * inside it. Read params with the router's own hooks.
 *
 * @category apps
 */
export type MdkAppRoute = {
  /** Path relative to the app's mount. `''` (or `'/'`) is its landing page. */
  path: string
  /** Sidebar label. Defaults to the app's `displayName` for its landing page. */
  label?: string
  /** Routed but kept out of the sidebar — a deep link reached from another page. */
  hidden?: boolean
  /**
   * Sidebar section, e.g. `'Operations'`. Pages sharing a section are listed
   * together under it, sections in the order their first page appears; pages
   * without one sit directly in the app's group. Give the section an icon in
   * the module's `sections`.
   */
  section?: string
  /** The page. Rendered inside the app's {@link MdkAppProvider} and an error boundary. */
  component: ComponentType
}

/**
 * How the sidebar draws one route `section`. A section needs no entry here to
 * work; an entry only adds what a label alone cannot.
 *
 * @category apps
 */
export type MdkAppSection = {
  /** The `section` its routes name. */
  label: string
  /** Sidebar icon, rendered with no props. */
  icon?: ComponentType
}

/**
 * The panel slots every MDK shell provides. `HOME` is the shell's landing page.
 *
 * @category apps
 */
export const MDK_APP_PANEL_SLOT = {
  HOME: 'home',
} as const

/**
 * Where a shell mounts an app's panel. Every MDK shell provides
 * {@link MDK_APP_PANEL_SLOT}; a shell may offer more and ignores slots it does
 * not know.
 *
 * @category apps
 */
export type MdkAppPanelSlot =
  (typeof MDK_APP_PANEL_SLOT)[keyof typeof MDK_APP_PANEL_SLOT] | (string & {})

/**
 * A component an app contributes to a page the shell owns, e.g. a card on Home.
 *
 * @category apps
 */
export type MdkAppPanel = {
  /** Unique within the app. */
  id: string
  /** Which shell slot renders it. */
  slot: MdkAppPanelSlot
  /** Heading the shell shows above it. Defaults to the app's `displayName`. */
  title?: string
  /** The panel. Rendered inside the app's {@link MdkAppProvider} and an error boundary. */
  component: ComponentType
}

/**
 * What an app's UI entry (`ui/index.js`) default-exports.
 *
 * `id` and `displayName` repeat the app's `mdk-app.yaml`; the shell checks `id`
 * against the installed app's id in the dashboard's app list (`/app-ui.json`),
 * so a package can never load under another app's identity.
 *
 * @category apps
 */
export type MdkAppUiModule = {
  /** The app's reverse-DNS id — must equal `id` in its `mdk-app.yaml`. */
  id: string
  displayName: string
  routes: MdkAppRoute[]
  panels: MdkAppPanel[]
  /** Icons for the routes' sections. Optional, as is any section's entry. */
  sections?: MdkAppSection[]
}

/**
 * An installed app whose UI loaded and passed the contract check.
 *
 * @category apps
 */
export type LoadedAppUi = {
  app: InstalledApp
  ui: MdkAppUiModule
}

/**
 * An installed app whose UI could not be used — the import failed, or the
 * module broke the contract. Reported, never thrown: one broken app must not
 * keep the others (or the shell) from loading.
 *
 * @category apps
 */
export type AppUiLoadFailure = {
  app: InstalledApp
  error: Error
}

/**
 * Imports one module by URL. The default is the browser's own dynamic
 * `import()`; tests and unusual hosts can pass their own.
 *
 * @category apps
 */
export type ImportAppModule = (url: string) => Promise<unknown>
