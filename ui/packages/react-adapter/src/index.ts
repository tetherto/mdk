/**
 * @tetherto/mdk-react-adapter — React adapter for @tetherto/mdk-ui-foundation.
 *
 * Provides:
 *   - `<MdkProvider>` — wraps `QueryClientProvider` and exposes the resolved
 *     API base URL to descendants.
 *   - Store hooks   — `useAuth`, `useDevices`, `useTimezone`, `useNotifications`
 *   - Utility hooks — `usePagination`, `useLocalStorage`, `useKeyDown`, `usePlatform`,
 *     `useWindowSize`, `useDeviceResolution`, `useBeepSound`, `useContextualModal`,
 *     `useSubtractedTime`, `useGetAvailableDevices`, `useAuthToken`, `useTokenPolling`.
 *   - Domain hooks  — `useCheckPerm`, `useHasPerms`, `useIsFeatureEditingEnabled`,
 *     `useTimezoneFormatter`.
 *   - Report state  — `usePeriod` (a reporting period in the URL), `toQueryView`.
 *   - React utils   — `getControlSectionsTooltips`.
 *   - Installed apps — `useInstalledAppUis`, `MdkAppProvider` / `useMdkApp`,
 *     `defineMdkApp` and the app UI module contract a shell loads.
 *   - Re-exports    — `useQuery`, `useMutation`, `useQueryClient`, …
 *
 * Pure-TS helpers (auth/token/settings utilities, shared types) live in
 * `@tetherto/mdk-ui-foundation`; UI-coupled hooks/utilities (toast portal, alert
 * renderers, chart helpers) live in `@tetherto/mdk-react-devkit/domain`.
 */

export * from './apps/index.js'
export * from './hooks/index.js'
export * from './provider/index.js'
export * from './utils/index.js'

export const VERSION = '0.0.1'
