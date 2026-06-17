/**
 * React hooks exposed by `@tetherto/mdk-react-adapter`.
 *
 * Includes the raw store bindings, a curated set of React utility hooks
 * (pagination, local-storage, keyboard, sizing, etc.), and bindings that
 * compose adapter stores with reusable behaviour (permissions, timezone
 * formatting, action update flows).
 */

export type { MinerValidationData } from './hooks-types'

export { useActions, useAuth, useDevices, useNotifications, useTimezone } from './store-hooks'
export type { UseActiveIncidentsOptions } from './use-active-incidents'
export { useActiveIncidents } from './use-active-incidents'
export { useAuthToken } from './use-auth-token'
export type { UseBeepSoundOptions } from './use-beep-sound'
export { useBeepSound } from './use-beep-sound'
export type { UseConsumptionChartDataParams } from './use-consumption-chart-data'
export { useConsumptionChartData } from './use-consumption-chart-data'
export { useContextualModal } from './use-contextual-modal'
export type { UseCurrentAlertDevicesOptions } from './use-current-alert-devices'
export { useCurrentAlertDevices } from './use-current-alert-devices'
export type {
  DashboardDateRange,
  UseDashboardDateRangeOptions,
  UseDashboardDateRangeReturn,
} from './use-dashboard-date-range'
export { useDashboardDateRange } from './use-dashboard-date-range'
export type {
  DashboardExportPayload,
  ExportFormat,
  UseDashboardExportOptions,
  UseDashboardExportReturn,
} from './use-dashboard-export'
export { useDashboardExport } from './use-dashboard-export'
export type { DashboardTimeRange, UseDashboardTimeRangeOptions } from './use-dashboard-time-range'
export { useDashboardTimeRange } from './use-dashboard-time-range'
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
export type { UseHashrateChartDataParams } from './use-hashrate-chart-data'
export { useHashrateChartData } from './use-hashrate-chart-data'
export type { UseHistoricalAlertsOptions } from './use-historical-alerts'
export { useHistoricalAlerts } from './use-historical-alerts'
export { useIsFeatureEditingEnabled } from './use-is-feature-editing-enabled'
export { useKeyDown } from './use-key-down'
export { useLocalStorage } from './use-local-storage'
export { useMinerDuplicateValidation } from './use-miner-duplicate-validation'
export type { PaginationArgs, PaginationState, UsePaginationReturn } from './use-pagination'
export { usePagination } from './use-pagination'
export type { UsePduViewerReturn, ViewportBoundingBox } from './use-pdu-viewer'
export { usePduViewer } from './use-pdu-viewer'
export { useCheckPerm } from './use-permissions'
export type { OsTypeValue, PlatformResult } from './use-platform'
export { detectPlatform, OS_TYPES, usePlatform } from './use-platform'
export type { PoolRow, UsePoolRowsOptions, UsePoolRowsResult } from './use-pool-rows'
export { usePoolRows } from './use-pool-rows'
export type { PoolStats, UsePoolStatsOptions } from './use-pool-stats'
export { usePoolStats } from './use-pool-stats'
export type { UsePowerModeTimelineDataParams } from './use-power-mode-timeline-data'
export { usePowerModeTimelineData } from './use-power-mode-timeline-data'
export type { SiteConsumption } from './use-site-consumption'
export { useSiteConsumption } from './use-site-consumption'
export type { UseSiteConsumptionChartDataParams } from './use-site-consumption-chart-data'
export { useSiteConsumptionChartData } from './use-site-consumption-chart-data'
export type {
  SiteContainerCapacity,
  UseSiteContainerCapacityOptions,
} from './use-site-container-capacity'
export { useSiteContainerCapacity } from './use-site-container-capacity'
export type { SiteEfficiency, UseSiteEfficiencyParams } from './use-site-efficiency'
export { useSiteEfficiency } from './use-site-efficiency'
export type { SiteHashrate } from './use-site-hashrate'
export { useSiteHashrate } from './use-site-hashrate'
export type { SiteMinerCounts, UseSiteMinerCountsOptions } from './use-site-miner-counts'
export { useSiteMinerCounts } from './use-site-miner-counts'
export type { SiteMinerStats, UseSiteMinerStatsOptions } from './use-site-miner-stats'
export { useSiteMinerStats } from './use-site-miner-stats'
export type { SitePowerMeter, UseSitePowerMeterOptions } from './use-site-power-meter'
export { useSitePowerMeter } from './use-site-power-meter'
export type {
  ContainerPoolStat,
  ContainerUnit,
  ProcessedContainerUnit,
  SitesOverviewTailLogItem,
  UseSitesOverviewDataOptions,
  UseSitesOverviewDataResult,
} from './use-sites-overview-data'
export { useSitesOverviewData } from './use-sites-overview-data'
export type { SelectedEditSocket } from './use-static-miner-ip-assignment'
export { useStaticMinerIpAssignment } from './use-static-miner-ip-assignment'
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
