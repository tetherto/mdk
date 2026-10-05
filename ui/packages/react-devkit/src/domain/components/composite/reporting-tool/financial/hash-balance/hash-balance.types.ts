import type {
  FinanceQueryParams,
  HashRevenueLogEntry,
  HashRevenueResponse,
} from '@domain/types/finance'

import type { CURRENCY } from '@primitives'
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
  /** Optional log override */
  log?: HashRevenueLogEntry[]
  /** `USD` or `BTC` label for per-PH/day units */
  currency: HashBalanceCurrency
  /** Active reporting window */
  dateRange: FinancialDateRange
  /**
   * Revenue / cost log and summary payload
   * @default null
   */
  data?: HashRevenueResponse | null
  /**
   * Year / month / week mode
   * @default null
   */
  timeframeType?: TimeframeTypeValue | null
}

export type HashBalancePanelProps = Pick<
  UseHashBalanceInput,
  'data' | 'log' | 'dateRange' | 'timeframeType'
> & {
  /**
   * Loading state
   * @default false
   */
  isLoading?: boolean
}

export type HashBalanceCostPanelProps = HashBalancePanelProps

export type HashBalanceRevenuePanelProps = HashBalancePanelProps & {
  /** `USD` or `BTC` label for per-PH/day units */
  currency: HashBalanceCurrency
  /** Currency toggle handler */
  onCurrencyChange: (currency: HashBalanceCurrency) => void
}

export type HashBalanceProps = Partial<{
  /**
   * Show error state
   * @default false
   */
  isError: boolean
  /**
   * Show loading state
   * @default false
   */
  isLoading: boolean
  /**
   * Error copy when `isError`
   * @default 'Error loading hash balance data. Please try again later.'
   */
  errorMessage: string
  /** Root layout class */
  className: string
  /** Tabs wrapper class */
  tabsClassName: string
  /** Tab list class */
  tabsListClassName: string
  /**
   * Revenue / cost log and summary
   * @default null
   */
  data: HashRevenueResponse | null
  /**
   * Initial period
   * @default year-to-date
   */
  initialDateRange: FinancialDateRange
  /** Fired when the user changes the period */
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
