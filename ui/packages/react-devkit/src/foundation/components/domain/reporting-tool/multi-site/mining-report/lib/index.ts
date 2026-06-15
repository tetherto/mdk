export type { ChartBuilderOptions } from '../mining-report.types'

export { getPeriod, makeLabelFormatter, pickLogs } from '../mining-report.util'

export {
  buildBarChart,
  buildConstant,
  buildEfficiencyChart,
  buildHashrateChart,
  buildLineChart,
  buildLineSeries,
  buildRevenueChart,
  buildSeries,
  createEmptyChart,
  DEFAULT_DATALABELS,
  DEFAULT_GRADIENT,
  EMPTY_STRUCTURES,
  formatDataLabel,
} from './chart-builders'
export type { BarChartData, ChartSeries, LineChartData, LineChartSeries } from './chart-builders'

export {
  createChartDataProcessor,
  processChartDataWithMissingMonths,
  processChartDataWithMissingPeriods,
  processSeriesDataWithMissingMonths,
} from './chart-data-processor'

export {
  applyDayLimit,
  createCostAggregator,
  createEfficiencyAggregator,
  createHashrateAggregator,
  extractNominalValues,
  findRegionBySite,
  groupLogsByPeriod,
  processAggregatedData,
  processNetworkData,
  processSortedLogs,
} from './data-processors'

export {
  fillMissingMonths,
  fillMissingMonthsInAggregated,
  fillMissingMonthsInSeries,
  fillMissingPeriodsInAggregated,
  generateMonthRange,
  generateTimeRange,
  getLabelFormat,
} from './date-range-utils'

export {
  avg,
  calculateHashRevenueUSD,
  hsToPhs,
  mhsToPhs,
  safeNum,
  toPerPh,
  tsToISO,
  validateApiData,
  validateLogs,
  wToMw,
} from './mining-utils'
