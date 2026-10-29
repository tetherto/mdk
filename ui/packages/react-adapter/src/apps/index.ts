/**
 * Installed apps' UIs: the module contract an app's `ui/index.js` exports, the
 * loader a shell runs over its app list (`/app-ui.json`), and the context an
 * app's components use to reach their own API.
 */

export {
  checkAppUiModule,
  defineMdkApp,
  loadAppUi,
  type LoadAppUiOptions,
  loadAppUis,
} from './load-app-ui'
export {
  type MdkAppContextValue,
  MdkAppProvider,
  type MdkAppProviderProps,
  useMdkApp,
} from './mdk-app-context'
export type {
  AppUiLoadFailure,
  ImportAppModule,
  LoadedAppUi,
  MdkAppPanel,
  MdkAppPanelSlot,
  MdkAppRoute,
  MdkAppSection,
  MdkAppUiModule,
} from './types'
export { MDK_APP_PANEL_SLOT } from './types'
