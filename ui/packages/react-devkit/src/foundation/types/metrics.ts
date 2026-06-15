/**
 * Operational metrics v2 API types - shapes returned by `/auth/metrics/*`
 * endpoints.
 *
 * These are the contracts consumers feed back through the reporting-tool
 * base hooks (`useHashrate`, `useEnergyReportSite`, `useOperationsDashboard`,
 * ...). Foundation does not own the RTK Query / HTTP layer itself - see
 * api-integration-todo.md.
 */

export type MetricsQueryParams = {
  start: number
  end: number
  overwriteCache?: boolean
}

export type MetricsResponse<Log, Summary> = {
  log: Log[]
  summary: Summary
}

export type MetricsInterval = '1h' | '1d' | '1w'

// ============================================================================
// /auth/metrics/hashrate
// ============================================================================

export type MetricsHashrateGroupBy = 'container' | 'miner'

export type MetricsHashrateQueryParams = MetricsQueryParams & {
  groupBy?: MetricsHashrateGroupBy
}

export type MetricsHashrateLogEntry = {
  ts: number
  hashrateMhs: number
}

export type MetricsHashrateGroupedLogEntry = {
  ts: number
  hashrateMhs: Record<string, number>
}

export type MetricsHashrateSummary = {
  avgHashrateMhs: number | null
  totalHashrateMhs: number
}

export type MetricsHashrateResponse = MetricsResponse<
  MetricsHashrateLogEntry,
  MetricsHashrateSummary
>

export type MetricsHashrateGroupedSummary = {
  avgHashrateMhs: number | null
  totalHashrateMhs: number
  groupedBy?: Record<string, MetricsHashrateSummary>
}

export type MetricsHashrateGroupedResponse = MetricsResponse<
  MetricsHashrateGroupedLogEntry,
  MetricsHashrateGroupedSummary
>

// ============================================================================
// /auth/metrics/consumption
// ============================================================================

export type MetricsConsumptionGroupBy = 'container' | 'miner'

export type MetricsConsumptionQueryParams = MetricsQueryParams & {
  groupBy?: MetricsConsumptionGroupBy
}

export type MetricsConsumptionLogEntry = {
  ts: number
  powerW: number
  consumptionMWh: number
}

export type MetricsConsumptionGroupedLogEntry = {
  ts: number
  powerW: Record<string, number>
  consumptionMWh: Record<string, number> | null
}

export type MetricsConsumptionSummary = {
  avgPowerW: number | null
  totalConsumptionMWh: number
}

export type MetricsConsumptionGroupSummary = {
  avgPowerW: number | null
  totalConsumptionMWh: number
}

export type MetricsConsumptionGroupedSummary = {
  avgPowerW: number | null
  totalConsumptionMWh: number
  groupedBy?: Record<string, MetricsConsumptionGroupSummary>
}

export type MetricsConsumptionResponse = MetricsResponse<
  MetricsConsumptionLogEntry,
  MetricsConsumptionSummary
>

export type MetricsConsumptionGroupedResponse = MetricsResponse<
  MetricsConsumptionGroupedLogEntry,
  MetricsConsumptionGroupedSummary
>

// ============================================================================
// /auth/metrics/efficiency
// ============================================================================

export type MetricsEfficiencyLogEntry = {
  ts: number
  efficiencyWThs: number
}

export type MetricsEfficiencySummary = {
  avgEfficiencyWThs: number | null
}

export type MetricsEfficiencyResponse = MetricsResponse<
  MetricsEfficiencyLogEntry,
  MetricsEfficiencySummary
>

// ============================================================================
// /auth/metrics/miner-status
// ============================================================================

export type MetricsMinerStatusLogEntry = {
  ts: number
  online: number
  offline: number
  sleep: number
  maintenance: number
}

export type MetricsMinerStatusSummary = {
  avgOnline: number | null
  avgOffline: number | null
  avgSleep: number | null
  avgMaintenance: number | null
}

export type MetricsMinerStatusResponse = MetricsResponse<
  MetricsMinerStatusLogEntry,
  MetricsMinerStatusSummary
>

// ============================================================================
// /auth/metrics/power-mode
// ============================================================================

export type MetricsPowerModeQueryParams = MetricsQueryParams & {
  interval?: MetricsInterval
}

export type MetricsPowerModeLogEntry = {
  ts: number
  low: number
  normal: number
  high: number
  sleep: number
  offline: number
  notMining: number
  maintenance: number
  error: number
}

export type MetricsPowerModeSummary = {
  avgLow: number | null
  avgNormal: number | null
  avgHigh: number | null
  avgSleep: number | null
  avgOffline: number | null
  avgNotMining: number | null
  avgMaintenance: number | null
  avgError: number | null
}

export type MetricsPowerModeResponse = MetricsResponse<
  MetricsPowerModeLogEntry,
  MetricsPowerModeSummary
>

// ============================================================================
// /auth/metrics/power-mode/timeline
// ============================================================================

export type MetricsPowerModeTimelineQueryParams = {
  start?: number
  end?: number
  container?: string
  overwriteCache?: boolean
}

export type MetricsPowerModeTimelineSegment = {
  from: number
  to: number
  powerMode: string
  status: string
}

export type MetricsPowerModeTimelineLogEntry = {
  minerId: string
  container: string
  segments: MetricsPowerModeTimelineSegment[]
}

export type MetricsPowerModeTimelineResponse = {
  log: MetricsPowerModeTimelineLogEntry[]
}

// ============================================================================
// /auth/metrics/temperature
// ============================================================================

export type MetricsTemperatureQueryParams = MetricsQueryParams & {
  interval?: MetricsInterval
  container?: string
}

export type MetricsTemperatureContainerStats = {
  maxC: number
  avgC: number
}

export type MetricsTemperatureLogEntry = {
  ts: number
  containers: Record<string, MetricsTemperatureContainerStats>
  siteMaxC: number | null
  siteAvgC: number | null
}

export type MetricsTemperatureSummary = {
  avgMaxTemp: number | null
  avgAvgTemp: number | null
  peakTemp: number | null
}

export type MetricsTemperatureResponse = MetricsResponse<
  MetricsTemperatureLogEntry,
  MetricsTemperatureSummary
>
