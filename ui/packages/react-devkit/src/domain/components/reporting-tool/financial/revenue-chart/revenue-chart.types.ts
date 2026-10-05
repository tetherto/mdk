import type { Position } from '@primitives'

/** A single time-period revenue record; reserved keys plus one numeric value per site ID. */
export type RevenueDataItem = {
  timeKey: string
  period: string
  timestamp: number
  [key: string]: unknown
}

/** A site reference used to resolve site IDs in the data to display names. */
export type SiteItem = {
  id: string
  name?: string
}

/** Props for `RevenueChart`; pass pre-fetched data and optional legend layout overrides. */
export type RevenueChartProps = Partial<{
  /**
   * Raw API response, each entry is one time period with site IDs as dynamic keys
   * @default []
   */
  data: RevenueDataItem[]
  /**
   * Shows a loading spinner while data is being fetched
   * @default false
   */
  isLoading: boolean
  /**
   * List to resolve site IDs to display names
   * @default []
   */
  siteList: (string | SiteItem)[]
  /**
   * Chart legend position
   * @default 'bottom'
   */
  legendPosition: Position
  /**
   * Chart legend alignment
   * @default 'start'
   */
  legendAlign: 'start' | 'center' | 'end'
}>

/** Internal intermediate type representing a single site's revenue data keyed by timeKey. */
export type RevenueDatasetValue = { value: number }

export type RevenueDatasetEntry = {
  label: string
  stackGroup: string
  [dateKey: string]: RevenueDatasetValue | string
}
