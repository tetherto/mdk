import type { ReportType } from '../../mining-report.types'

import { TIMEFRAME_TYPE } from '@/constants/ranges'

/**
 * Period-specific configuration for SiteDetails rendering
 */
export type SiteDetailsPeriodConfig = {
  buckets: number
  days: number
  powerDays: number
  subsidyDays: number
  timeframeType: string
  periodLabel: string
  avgDowntimeChartTitle: string
  // Whether to show yearly-specific pages (CostSummary, Ebitda, EnergyCosts, HashCosts)
  showYearlyPages: boolean
}

/**
 * Configuration map for different report periods in SiteDetails
 */
export const SITE_DETAILS_CONFIG: Record<ReportType, SiteDetailsPeriodConfig> = {
  weekly: {
    buckets: 7,
    days: 7,
    powerDays: 360,
    subsidyDays: 7,
    timeframeType: TIMEFRAME_TYPE.WEEK,
    periodLabel: 'Weekly',
    avgDowntimeChartTitle: 'Daily Average Downtime',
    showYearlyPages: false,
  },
  monthly: {
    buckets: 11,
    days: 11,
    powerDays: 360,
    subsidyDays: 15,
    timeframeType: TIMEFRAME_TYPE.MONTH,
    periodLabel: 'Monthly',
    avgDowntimeChartTitle: 'Monthly Average Downtime',
    showYearlyPages: false,
  },
  yearly: {
    buckets: 12,
    days: 12,
    powerDays: 12,
    subsidyDays: 12,
    timeframeType: TIMEFRAME_TYPE.YEAR,
    periodLabel: '1 Year',
    avgDowntimeChartTitle: 'Monthly Average Downtime',
    showYearlyPages: true,
  },
}

/**
 * Get SiteDetails config for a given report type
 */
export const getSiteDetailsConfig = (reportType: ReportType | string): SiteDetailsPeriodConfig => {
  const normalizedType = reportType as ReportType
  return SITE_DETAILS_CONFIG[normalizedType] || SITE_DETAILS_CONFIG.yearly
}
