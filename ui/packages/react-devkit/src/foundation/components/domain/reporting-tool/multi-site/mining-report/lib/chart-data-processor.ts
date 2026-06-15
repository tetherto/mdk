import type { AggregatedDataItem } from '../mining-report.types'

import {
  fillMissingMonthsInAggregated,
  fillMissingMonthsInSeries,
  fillMissingPeriodsInAggregated,
} from './date-range-utils'

/**
 * Series data interface
 */
type SeriesData = {
  labels?: string[]
  values?: number[]
  [key: string]: unknown
}

/**
 * Processor options interface
 */
type ProcessorOptions = {
  startDate?: string | Date
  endDate?: string | Date
  period?: string
  [key: string]: unknown
}

/**
 * Chart result structure
 */
type ChartResult = {
  aggregated?: AggregatedDataItem[]
  [key: string]: unknown
}

/**
 * Process chart data to fill missing months with zero values
 */
export const processChartDataWithMissingMonths = (
  data: AggregatedDataItem[],
  startDate: string | Date | undefined,
  endDate: string | Date | undefined,
  period: string = 'monthly',
  labelFormat: string = 'MM-dd',
): AggregatedDataItem[] => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return []
  }

  // Only fill missing months for monthly period
  if (period !== 'monthly' || !startDate || !endDate) {
    return data
  }

  return fillMissingMonthsInAggregated(data, startDate, endDate, labelFormat)
}

/**
 * Process chart data to fill missing time periods with zero values
 */
export const processChartDataWithMissingPeriods = (
  data: AggregatedDataItem[],
  startDate: string | Date | undefined,
  endDate: string | Date | undefined,
  period: string = 'daily',
  labelFormat: string = 'dd-MM',
): AggregatedDataItem[] => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return []
  }

  // Only fill missing periods if date range is provided
  if (!startDate || !endDate) {
    return data
  }

  return fillMissingPeriodsInAggregated(data, startDate, endDate, period, labelFormat)
}

/**
 * Process chart series data to fill missing months with zero values
 */
export const processSeriesDataWithMissingMonths = <T extends SeriesData>(
  seriesData: T[],
  startDate: string | Date | undefined,
  endDate: string | Date | undefined,
  period: string = 'monthly',
  labelFormat: string = 'MM-dd',
): T[] => {
  if (!seriesData || !Array.isArray(seriesData) || seriesData.length === 0) {
    return []
  }

  // Only fill missing months for monthly period
  if (period !== 'monthly' || !startDate || !endDate) {
    return seriesData
  }

  return fillMissingMonthsInSeries(seriesData, startDate, endDate, labelFormat)
}

/**
 * Create a wrapper function for chart data processing that includes missing month filling
 */
export const createChartDataProcessor =
  <TApi, TResult extends ChartResult>(
    originalProcessor: (api: TApi, options: ProcessorOptions) => TResult,
  ) =>
  (api: TApi, processorOptions: ProcessorOptions = {}): TResult => {
    const result = originalProcessor(api, processorOptions)

    // Extract date range information from processor options
    const { startDate, endDate, period } = processorOptions

    // Process each chart in the result
    const processedResult: Record<string, unknown> = { ...result }

    // Process aggregated data if it exists
    if (result.aggregated) {
      processedResult.aggregated = processChartDataWithMissingMonths(
        result.aggregated,
        startDate,
        endDate,
        period,
      )
    }

    // Process individual chart data
    Object.keys(result).forEach((key) => {
      const chartData = result[key] as { series?: SeriesData[] }
      if (key.endsWith('Chart') && chartData && chartData.series) {
        processedResult[key] = {
          ...chartData,
          series: processSeriesDataWithMissingMonths(chartData.series, startDate, endDate, period),
        }
      }
    })

    return processedResult as TResult
  }
