import type { ReactNode } from 'react'

export type ReportType = 'weekly' | 'monthly' | 'yearly'
export type ReportPeriod = 'daily' | 'monthly' | 'yearly'

export type ChartBuilderOptions = Partial<{
  regionFilter: string[]
  buckets: number
  startDate: string | Date | number
  endDate: string | Date | number
}>

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Base log entry containing all common metrics
 * Used for both daily and monthly aggregations
 */
export type BaseLogEntry = {
  ts: number
  period: ReportPeriod
  totalRevenueBTC: number
  totalFeesBTC: number
  totalFeesUSD: number | null
  revenueUSD: number | null
  totalCostsUSD: number
  ebitdaSellingBTC: number | null
  ebitdaNotSellingBTC: number
  energyRevenueBTC_MW: number | null
  energyRevenueUSD_MW: number | null
  hashRevenueBTC_PHS_d: number | null
  hashRevenueUSD_PHS_d: number | null
  hashCostBTC_PHS_d: number | null
  hashCostUSD_PHS_d: number | null
  hashrateMHS: number
  sitePowerW: number
  avgFeesSatsVByte: number | null
  currentBTCPrice: number
  efficiencyWThs: number
  totalEnergyCostsUSD: number
  totalOperationalCostsUSD: number
  curtailmentMWh: number
  curtailmentRate: number
  operationalIssues: number | null
  downtimeRate: number
  region?: string
  // Optional fields used for calculations (may not exist in all responses)
  hashRevenueBTC?: number
  hashRevenueUSD?: number
}

/**
 * Summary entry type - same as BaseLogEntry but without ts and period
 * Used for summary.sum and summary.avg which don't have these fields
 */
export type SummaryEntry = Omit<BaseLogEntry, 'ts' | 'period'>

/**
 * Daily log entry (used in weekly and monthly reports)
 */
export type DailyLogEntry = {
  period: 'daily'
} & BaseLogEntry

/**
 * Monthly log entry (used in annual reports)
 * Includes additional month identification fields
 */
export type MonthlyLogEntry = {
  period: 'monthly'
  month: number
  year: number
  monthName?: string // Optional - not always present in API response
} & BaseLogEntry

/**
 * Yearly log entry (used in multi-year reports)
 * Includes year identification field
 */
export type YearlyLogEntry = {
  period: 'yearly'
  year: number
} & BaseLogEntry

/**
 * Union type for all log entry types
 */
export type LogEntry = DailyLogEntry | MonthlyLogEntry | YearlyLogEntry

/**
 * Per-region data structure
 * Contains logs, summary statistics, and nominal values for a specific site/region
 */
export type RegionData = {
  region: string
  log: LogEntry[]
  summary: {
    sum: SummaryEntry
    avg: SummaryEntry
  }
  nominalHashrate: number
  nominalEfficiency: number
  nominalMinerCapacity: number
}

/**
 * Aggregated data across all sites
 * Includes summary statistics (sum and average)
 */
export type AggregatedData = {
  log: LogEntry[]
  summary: {
    sum: SummaryEntry
    avg: SummaryEntry
  }
  nominalHashrate: number
  nominalMinerCapacity: number
  nominalEfficiency: number
}

/**
 * Complete API response structure for report data
 */
export type ReportApiResponse = {
  regions: RegionData[]
  data: AggregatedData
  period: ReportPeriod
}

// ============================================================================
// Data Processing Types
// ============================================================================

/**
 * Aggregated data item with label and arbitrary properties
 * Used by date range utilities and data processors
 */
export type AggregatedDataItem = {
  label: string
  ts?: number
  [key: string]: unknown
}

// Chart view-model types (BarChartData, LineChartData, ChartSeries, …) live in
// `./lib/chart-builders.ts` — import from there or `@/…/mining-report/lib`.

// ============================================================================
// Date Range Types
// ============================================================================

/**
 * Parsed date range object
 */
export type DateRange = {
  startDate: Date
  endDate: Date
}

/**
 * Date range as string (from URL params)
 * Example: "Oct 03 - Oct 09, 2025"
 */
export type DateRangeString = string

export type MiningReportSite = {
  id: string
  value: string
  label: string
  name?: string
}

// ============================================================================
// Component Props Types
// ============================================================================

/**
 * Common props for report components
 */
export type ReportComponentProps = {
  data: ReportApiResponse
  dateRange: DateRangeString
  reportType: ReportType
}

/**
 * Props for site-specific report sections
 */
export type SiteReportProps = {
  region?: string
} & ReportComponentProps

/**
 * Metric card data structure
 */
export type MetricCardData = {
  id?: string
  label: string
  value: string | number
  unit?: string
  isHighlighted?: boolean
  isNegative?: boolean
  prefix?: string
  suffix?: string
  formatter?: (value: number) => string
}

/**
 * Report configuration for PDF export
 */
export type ReportConfig = {
  title: string
  subtitle: string
  fileName: string
  component: ReactNode
}

export type MiningReportProps = {
  reportType: string
  dateRange: DateRangeString
  location: string
  /** Cover hero title when different from `location` (e.g. "All sites") */
  coverTitle?: string
  data?: ReportApiResponse
  isLoading?: boolean
  error?: unknown
  sites: MiningReportSite[]
  siteId?: string
  onExportPdf?: () => void | Promise<void>
  isExporting?: boolean
  exportControls?: ReactNode
}
