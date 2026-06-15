export const RANGES = {
  LAST7: 'Last 7 Days',
  LAST14: 'Last 14 Days',
  LAST30: 'Last 30 Days',
  LAST90: 'Last 90 Days',
  YESTERDAY: 'Yesterday',
  CUSTOM_RANGE: 'Custom Range',
} as const

export const AVG_HISTORY_RANGES = {
  LAST14: '14 days',
  LASTMONTH: '1 month',
} as const

export const PERIOD = {
  DAILY: 'daily',
  YEARLY: 'yearly',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
} as const

export const TIMEFRAME_TYPE = {
  YEAR: 'year',
  WEEK: 'week',
  MONTH: 'month',
} as const

// Type exports
export type RangeKey = keyof typeof RANGES
export type RangeValue = (typeof RANGES)[RangeKey]
export type AvgHistoryRangeKey = keyof typeof AVG_HISTORY_RANGES
export type AvgHistoryRangeValue = (typeof AVG_HISTORY_RANGES)[AvgHistoryRangeKey]
export type PeriodKey = keyof typeof PERIOD
export type PeriodValue = (typeof PERIOD)[PeriodKey]
export type TimeframeTypeKey = keyof typeof TIMEFRAME_TYPE
export type TimeframeTypeValue = (typeof TIMEFRAME_TYPE)[TimeframeTypeKey]
