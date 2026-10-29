/**
 * React hooks exposed by `@tetherto/mdk-react-adapter`.
 *
 * Includes the raw store bindings, a curated set of React utility hooks
 * (pagination, local-storage, keyboard, sizing, etc.), bindings that
 * compose adapter stores with reusable behavior (permissions, timezone
 * formatting, token polling), the installed-app hooks, and re-exports of the
 * TanStack Query hooks. Pages read their own Gateway routes with `useQuery`.
 */

export { useAuth, useDevices, useNotifications, useTimezone } from './store-hooks'
export { useAuthToken } from './use-auth-token'
export type { UseBeepSoundOptions } from './use-beep-sound'
export { useBeepSound } from './use-beep-sound'
export { useContextualModal } from './use-contextual-modal'
export type { DeviceResolution } from './use-device-resolution'
export { BREAKPOINTS, useDeviceResolution } from './use-device-resolution'
export type {
  AvailableDevices,
  AvailableDevicesInput,
  UseGetAvailableDevicesOptions,
} from './use-get-available-devices'
export { useGetAvailableDevices } from './use-get-available-devices'
export type { PermissionRequest } from './use-has-perms'
export { useHasPerms } from './use-has-perms'
export type {
  InstalledAppPanel,
  UseInstalledAppPanelsResult,
} from './use-installed-app-panels'
export { useInstalledAppPanels } from './use-installed-app-panels'
export type {
  UseInstalledAppUisOptions,
  UseInstalledAppUisResult,
} from './use-installed-app-uis'
export { useInstalledAppUis } from './use-installed-app-uis'
export { useIsFeatureEditingEnabled } from './use-is-feature-editing-enabled'
export { useKeyDown } from './use-key-down'
export { useLocalStorage } from './use-local-storage'
export type { PaginationArgs, PaginationState, UsePaginationReturn } from './use-pagination'
export { usePagination } from './use-pagination'
export { useCheckPerm } from './use-permissions'
export type { OsTypeValue, PlatformResult } from './use-platform'
export { detectPlatform, OS_TYPES, usePlatform } from './use-platform'
export type { PeriodState, SearchParamsState, UsePeriodDefaults } from './use-period'
export { usePeriod } from './use-period'
export { useSubtractedTime } from './use-subtracted-time'
export type { UseTimezoneFormatterReturn } from './use-timezone'
export { useTimezoneFormatter } from './use-timezone'
export type { UseTokenPollingOptions } from './use-token-polling'
export { TOKEN_POLLING_INTERVAL_MS, useTokenPolling } from './use-token-polling'
export type { WindowSize } from './use-windows-size'
export { useWindowSize } from './use-windows-size'

export {
  useInfiniteQuery,
  useIsFetching,
  useIsMutating,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
