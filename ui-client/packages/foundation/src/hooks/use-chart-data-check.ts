import type { ChartDataset, UnknownRecord } from '@mdk/core'

import { getChartDataAvailability, hasDataValues, isNil } from '@mdk/core'

/**
 * Chart data with multiple datasets (e.g., LineChart)
 */
type ChartDataWithDatasets = {
  datasets: ChartDataset[]
  [key: string]: unknown
}

/**
 * Chart data with single dataset (e.g., some custom charts)
 */
type ChartDataWithDataset = {
  dataset: UnknownRecord | unknown[]
  [key: string]: unknown
}

/**
 * Generic chart data type
 */
type ChartData = ChartDataWithDatasets | ChartDataWithDataset | Record<string, unknown> | unknown[]

type UseChartDataCheckParams = {
  /**
   * Direct dataset for BarChart components
   */
  dataset?: UnknownRecord | unknown[]

  /**
   * Data object containing datasets or dataset
   */
  data?: ChartData
}

/**
 * Type guard to check if data has datasets property (LineChart)
 */
const hasDatasets = (data: ChartData): data is ChartDataWithDatasets => {
  return (
    typeof data === 'object' &&
    !isNil(data) &&
    !Array.isArray(data) &&
    'datasets' in data &&
    Array.isArray((data as Partial<ChartDataWithDatasets>).datasets)
  )
}

/**
 * Type guard to check if data has dataset property (custom charts)
 */
const hasDataset = (data: ChartData): data is ChartDataWithDataset => {
  return typeof data === 'object' && !isNil(data) && !Array.isArray(data) && 'dataset' in data
}

/**
 * Hook to check if chart data is empty or unavailable
 *
 * Returns `true` if data is empty/unavailable (should show empty state)
 * Returns `false` if data exists (should show chart)
 *
 * @param dataset - Direct dataset for BarChart components
 * @param dataset.dataset - Dataset property inside the dataset parameter (for custom charts)
 * @param dataset.data - Data property inside the dataset parameter (for charts with data object)
 * @returns Boolean indicating if data is empty
 *
 * @example
 * // BarChart with direct dataset
 * ```tsx
 * const isEmpty = useChartDataCheck({ dataset: barChartDataset })
 *
 * if (isEmpty) {
 *   return <EmptyState message="No data available" />
 * }
 *
 * return <BarChart data={dataset} />
 * ```
 *
 * @example
 * // LineChart with data.datasets
 * ```tsx
 * const isEmpty = useChartDataCheck({ data: lineChartData })
 *
 * if (isEmpty) {
 *   return <EmptyState message="No chart data" />
 * }
 *
 * return <LineChart data={data} />
 * ```
 *
 * @example
 * // Custom chart with data.dataset
 * ```tsx
 * const isEmpty = useChartDataCheck({ data: { dataset: customData } })
 *
 * return isEmpty ? <EmptyState /> : <CustomChart data={data} />
 * ```
 */
export const useChartDataCheck = ({ dataset, data }: UseChartDataCheckParams): boolean => {
  // Priority 1: Check direct dataset (BarChart pattern)
  if (dataset !== undefined) {
    return !hasDataValues(dataset)
  }

  // Priority 2: Check data.datasets (LineChart pattern)
  if (data !== undefined && hasDatasets(data)) {
    return !getChartDataAvailability(data.datasets)
  }

  // Priority 3: Check data.dataset (custom chart pattern)
  if (data !== undefined && hasDataset(data)) {
    return !hasDataValues(data.dataset)
  }

  // No valid data provided - show empty state
  return true
}
