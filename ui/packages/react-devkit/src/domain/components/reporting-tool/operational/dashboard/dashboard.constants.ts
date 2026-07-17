import { CHART_COLORS, UNITS } from '@primitives'

// Stable ids for each dashboard chart - used as expand keys and DOM ids.
export const OPERATIONAL_DASHBOARD_CHART_IDS = {
  HASHRATE: 'hashrate',
  CONSUMPTION: 'consumption',
  EFFICIENCY: 'efficiency',
  MINERS: 'miners',
} as const

export type OperationalDashboardChartId =
  (typeof OPERATIONAL_DASHBOARD_CHART_IDS)[keyof typeof OPERATIONAL_DASHBOARD_CHART_IDS]

// Shared chart-body height (px) across the four cards.
export const OPERATIONAL_DASHBOARD_CHART_HEIGHT = 300

// Primary trend series color.
export const TREND_SERIES_COLOR = CHART_COLORS.METALLIC_BLUE
// Nominal / reference line color.
export const NOMINAL_LINE_COLOR = CHART_COLORS.red

// Series + reference legend labels per trend chart (match the OSS dashboard).
export const HASHRATE_LABELS = {
  series: 'Hashrate',
  nominal: 'Nominal Hashrate',
} as const
export const CONSUMPTION_LABELS = {
  series: 'Power Consumption',
  nominal: 'Power Availability',
} as const
export const EFFICIENCY_LABELS = {
  series: 'Actual Site Efficiency',
  nominal: 'Nominal Site Efficiency',
} as const

// Display units. The kit standardizes hashrate on TH/s.
export const DASHBOARD_HASHRATE_UNIT = UNITS.HASHRATE_TH_S
export const DASHBOARD_CONSUMPTION_UNIT = UNITS.ENERGY_MW
export const DASHBOARD_EFFICIENCY_UNIT = UNITS.EFFICIENCY_W_PER_TH_S

// Two-decimal axis / label formatter shared by the three trend charts.
export const formatTrendValue = (value: number): string => value.toFixed(2)

// Stack-group key for the stacked miners-status bars.
export const MINERS_STACK_GROUP = 'miners'

// Ordered miners-status series config (label + color), matching the OSS order.
export const MINERS_STATUS_CONFIG = [
  { key: 'online', label: 'Online', color: CHART_COLORS.green },
  { key: 'error', label: 'Error', color: CHART_COLORS.red },
  { key: 'offline', label: 'Offline', color: CHART_COLORS.white },
  { key: 'sleep', label: 'Sleep', color: CHART_COLORS.blue },
  { key: 'maintenance', label: 'Maintenance', color: CHART_COLORS.orange },
] as const

// Tooltip copy for the site-efficiency info affordance.
export const SITE_EFFICIENCY_INFO =
  'This is site efficiency, considering both miners and additional systems (Cooling etc)'
