/**
 * @tetherto/mdk-react-adapter — React adapter for @tetherto/mdk-ui-core.
 *
 * Provides:
 *   - `<MdkProvider>` — wraps `QueryClientProvider` and exposes the resolved
 *     API base URL to descendants.
 *   - Store hooks   — `useAuth`, `useDevices`, `useTimezone`, `useNotifications`, `useActions`
 *   - Utility hooks — `usePagination`, `useLocalStorage`, `useKeyDown`, `usePlatform`,
 *     `useWindowSize`, `useDeviceResolution`, `useBeepSound`, `useContextualModal`,
 *     `usePduViewer`, `useSubtractedTime`, `useStaticMinerIpAssignment`,
 *     `useMinerDuplicateValidation`, `useNominalConfig`.
 *   - Domain hooks  — `useCheckPerm`, `useHasPerms`, `useIsFeatureEditingEnabled`,
 *     `useTimezoneFormatter`.
 *   - React utils   — `getControlSectionsTooltips`.
 *   - Re-exports    — `useQuery`, `useMutation`, `useQueryClient`, …
 *
 * Pure-TS helpers (auth/token/settings utilities, shared types) live in
 * `@tetherto/mdk-ui-core`; UI-coupled hooks/utilities (toast portal, alert
 * renderers, chart helpers) live in `@tetherto/mdk-react-devkit/foundation`.
 */

export * from './hooks/index.js'
export type { NominalConfig } from './hooks/use-nominal-config'
export { useNominalConfig } from './hooks/use-nominal-config'
export * from './provider/index.js'
export * from './utils/index.js'

export const VERSION = '0.0.1'
