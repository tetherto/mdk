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
  data: RevenueDataItem[]
  isLoading: boolean
  siteList: (string | SiteItem)[]
  legendPosition: Position
  legendAlign: 'start' | 'center' | 'end'
}>

/** Internal intermediate type representing a single site's revenue data keyed by timeKey. */
export type RevenueDatasetValue = { value: number }

export type RevenueDatasetEntry = {
  label: string
  stackGroup: string
  [dateKey: string]: RevenueDatasetValue | string
}
