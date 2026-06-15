import type { FinanceQueryParams, HashRevenueLogEntry, HashRevenueResponse } from '@/types/finance'

import type { CURRENCY } from '@core'
import type { TimeframeTypeValue } from '../../../../../constants/ranges'
import type {
  FinancialDateRange,
  PeriodType,
} from '../../../../reporting-tool/utils/financial-period'
import type { ToBarChartDataInput } from '../../../../reporting-tool/utils/to-bar-chart-data'

import type { buildNetworkHashrateLineData } from './hash-balance-chart.utils'

export type HashBalanceCurrency = typeof CURRENCY.USD_LABEL | typeof CURRENCY.BTC_LABEL

export type HashBalanceMetric = {
  label: string
  unit: string
  value: number
  isHighlighted?: boolean
}

export type FormatHashBalanceValueOptions = {
  forAxis?: boolean
}

export type UseHashBalanceInput = {
  log?: HashRevenueLogEntry[]
  currency: HashBalanceCurrency
  dateRange: FinancialDateRange
  data?: HashRevenueResponse | null
  timeframeType?: TimeframeTypeValue | null
}

export type HashBalancePanelProps = Pick<
  UseHashBalanceInput,
  'data' | 'log' | 'dateRange' | 'timeframeType'
> & {
  isLoading?: boolean
}

export type HashBalanceCostPanelProps = HashBalancePanelProps

export type HashBalanceRevenuePanelProps = HashBalancePanelProps & {
  currency: HashBalanceCurrency
  onCurrencyChange: (currency: HashBalanceCurrency) => void
}

export type HashBalanceProps = Partial<{
  isError: boolean
  isLoading: boolean
  errorMessage: string
  className: string
  tabsClassName: string
  tabsListClassName: string
  data: HashRevenueResponse | null
  initialDateRange: FinancialDateRange
  onDateRangeChange: (dateRange: FinancialDateRange, query: FinanceQueryParams) => void
}>

export type UseHashBalanceDerived = {
  isEmpty: boolean
  periodType: PeriodType
  showCombinedCostChart: boolean
  isNetworkHashrateEmpty: boolean
  costMetrics: HashBalanceMetric[]
  showWeeklyCostDisclaimer: boolean
  filteredLog: HashRevenueLogEntry[]
  revenueMetrics: HashBalanceMetric[]
  combinedCostInput: ToBarChartDataInput
  siteHashRevenueInput: ToBarChartDataInput
  networkHashpriceInput: ToBarChartDataInput
  networkHashrateLineData: ReturnType<typeof buildNetworkHashrateLineData>
}
