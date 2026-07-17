/**
 * React hooks exposed by `@tetherto/mdk-react-adapter`.
 *
 * Includes the raw store bindings, a curated set of React utility hooks
 * (pagination, local-storage, keyboard, sizing, etc.), bindings that
 * compose adapter stores with reusable behavior (permissions, timezone
 * formatting, action update flows), and Op Centre read hooks
 * (`@category op-centre`) for the Operational Centre pages.
 */

export type { MinerValidationData } from './hooks-types'

export {
  ALERTS_POLL_INTERVAL_MS,
  LIVE_ACTIONS_POLL_INTERVAL_MS,
  OP_CENTRE_REALTIME_POLL_INTERVAL_MS,
  POOL_MANAGER_POLL_INTERVAL_MS,
  SITE_STATUS_POLL_INTERVAL_MS,
} from './poll-intervals'
export { useActions, useAuth, useDevices, useNotifications, useTimezone } from './store-hooks'
export type { UseActiveIncidentsOptions } from './use-active-incidents'
export { useActiveIncidents } from './use-active-incidents'
export { useAuthToken } from './use-auth-token'
export type { UseBeepSoundOptions } from './use-beep-sound'
export { useBeepSound } from './use-beep-sound'
export type {
  UseCabinetDevicesOptions,
  UseCabinetDevicesResult,
} from './use-cabinet-devices'
export { useCabinetDevices } from './use-cabinet-devices'
export type {
  CabinetGroup,
  UseCabinetGroupsOptions,
  UseCabinetGroupsResult,
} from './use-cabinet-groups'
export { useCabinetGroups } from './use-cabinet-groups'
export type { CancelActionInput, UseCancelActionResult } from './use-cancel-action'
export { useCancelAction } from './use-cancel-action'
export type { UseConsumptionChartDataParams } from './use-consumption-chart-data'
export { useConsumptionChartData } from './use-consumption-chart-data'
export type {
  UseContainerPoolStatsOptions,
  UseContainerPoolStatsResult,
} from './use-container-pool-stats'
export { useContainerPoolStats } from './use-container-pool-stats'
export type {
  UseContainerSettingsOptions,
  UseContainerSettingsResult,
} from './use-container-settings'
export { useContainerSettings } from './use-container-settings'
export type {
  UseContainerSnapshotsOptions,
  UseContainerSnapshotsResult,
} from './use-container-snapshots'
export { useContainerSnapshots } from './use-container-snapshots'
export type { UseContainerUnitsOptions, UseContainerUnitsResult } from './use-container-units'
export { useContainerUnits } from './use-container-units'
export type {
  UseContainerWidgetsOptions,
  UseContainerWidgetsResult,
} from './use-container-widgets'
export { useContainerWidgets } from './use-container-widgets'
export { useContextualModal } from './use-contextual-modal'
export type { UseCurrentAlertDevicesOptions } from './use-current-alert-devices'
export { useCurrentAlertDevices } from './use-current-alert-devices'
export { useCurrentUserEmail } from './use-current-user-email'
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
export type { UseDeviceActionResult } from './use-device-action'
export { useDeviceAction } from './use-device-action'
export type { DeviceResolution } from './use-device-resolution'
export { BREAKPOINTS, useDeviceResolution } from './use-device-resolution'
export type { UseExplorerListOptions, UseExplorerListResult } from './use-explorer-list'
export { useExplorerList } from './use-explorer-list'
export type { UseFeatureFlagsOptions, UseFeatureFlagsResult } from './use-feature-flags'
export { useFeatureFlags } from './use-feature-flags'
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
export type { LiveActionsData } from './use-live-actions'
export { useLiveActions } from './use-live-actions'
export { useLocalStorage } from './use-local-storage'
export type { UseMinerDevicesOptions, UseMinerDevicesResult } from './use-miner-devices'
export { useMinerDevices } from './use-miner-devices'
export { useMinerDuplicateValidation } from './use-miner-duplicate-validation'
export type { UseMinersOptions, UseMinersResult } from './use-miners'
export { useMiners } from './use-miners'
export type { PaginationArgs, PaginationState, UsePaginationReturn } from './use-pagination'
export { usePagination } from './use-pagination'
export type {
  UsePduLayoutOptions,
  UsePduLayoutParams,
  UsePduLayoutResult,
} from './use-pdu-layout'
export { usePduLayout } from './use-pdu-layout'
export type { UsePduViewerReturn, ViewportBoundingBox } from './use-pdu-viewer'
export { usePduViewer } from './use-pdu-viewer'
export type { UsePendingActionsOptions, UsePendingActionsResult } from './use-pending-actions'
export { usePendingActions } from './use-pending-actions'
export { useCheckPerm } from './use-permissions'
export type { OsTypeValue, PlatformResult } from './use-platform'
export { detectPlatform, OS_TYPES, usePlatform } from './use-platform'
export type {
  UsePoolBalanceHistoryOptions,
  UsePoolBalanceHistoryResult,
} from './use-pool-balance-history'
export { usePoolBalanceHistory } from './use-pool-balance-history'
export type { UsePoolConfigsDataOptions, UsePoolConfigsDataResult } from './use-pool-configs-data'
export { usePoolConfigsData } from './use-pool-configs-data'
export type {
  PoolManagerAlert,
  PoolManagerDashboardStatItem,
  PoolManagerDashboardStats,
  UsePoolManagerDashboardOptions,
  UsePoolManagerDashboardResult,
} from './use-pool-manager-dashboard'
export { usePoolManagerDashboard } from './use-pool-manager-dashboard'
export type { PoolRow, UsePoolRowsOptions, UsePoolRowsResult } from './use-pool-rows'
export { usePoolRows } from './use-pool-rows'
export type { PoolStats, UsePoolStatsOptions } from './use-pool-stats'
export { usePoolStats } from './use-pool-stats'
export type { UsePoolsOptions, UsePoolsResult } from './use-pools'
export { usePools } from './use-pools'
export type { UsePowerModeTimelineDataParams } from './use-power-mode-timeline-data'
export { usePowerModeTimelineData } from './use-power-mode-timeline-data'
export type {
  UseRackLayoutOptions,
  UseRackLayoutParams,
  UseRackLayoutResult,
} from './use-rack-layout'
export { useRackLayout } from './use-rack-layout'
export type { UseSiteOptions, UseSiteResult } from './use-site'
export { useSite } from './use-site'
export type { SiteConsumption } from './use-site-consumption'
export { useSiteConsumption } from './use-site-consumption'
export type { UseSiteConsumptionChartDataParams } from './use-site-consumption-chart-data'
export { useSiteConsumptionChartData } from './use-site-consumption-chart-data'
export type {
  SiteContainerCapacity,
  UseSiteContainerCapacityOptions,
} from './use-site-container-capacity'
export { useSiteContainerCapacity } from './use-site-container-capacity'
export type { UseSiteDetailMinersResult } from './use-site-detail-miners'
export { useSiteDetailMiners } from './use-site-detail-miners'
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
export type { UseSiteStatusLiveOptions, UseSiteStatusLiveResult } from './use-site-status-live'
export { useSiteStatusLive } from './use-site-status-live'
export type { UseSitesOverviewOptions, UseSitesOverviewResult } from './use-sites-overview'
export { useSitesOverview } from './use-sites-overview'
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
export type { UseSubmitPendingActionsResult } from './use-submit-pending-actions'
export { useSubmitPendingActions } from './use-submit-pending-actions'
export type { UseSubmitSingleActionResult } from './use-submit-single-action'
export { useSubmitSingleAction } from './use-submit-single-action'
export { useSubtractedTime } from './use-subtracted-time'
export type { UseThingCommentResult } from './use-thing-comment'
export { COMMENTS_WRITE_PERM, useThingComment } from './use-thing-comment'
export type { UseThingDetailOptions, UseThingDetailResult } from './use-thing-detail'
export { useThingDetail } from './use-thing-detail'
export type { UseTimezoneFormatterReturn } from './use-timezone'
export { useTimezoneFormatter } from './use-timezone'
export type { UseTokenPollingOptions } from './use-token-polling'
export { TOKEN_POLLING_INTERVAL_MS, useTokenPolling } from './use-token-polling'
export type { UseVoteOnActionResult } from './use-vote-on-action'
export { useVoteOnAction } from './use-vote-on-action'
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
