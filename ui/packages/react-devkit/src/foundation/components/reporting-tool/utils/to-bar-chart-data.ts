import type { BarChartInput, BarChartSeries, FlexAlign, Position } from '@core'
import { buildBarChartData } from '@core'
import type { Context as ChartJsPluginDataLabelsContext } from 'chartjs-plugin-datalabels'
import _isEmpty from 'lodash/isEmpty'

export type DataLabelOverride = {
  anchor?: FlexAlign
  align?: Position
  offset?: number
  color?: string
  clamp?: boolean
  clip?: boolean
  display?: boolean | ((context: ChartJsPluginDataLabelsContext) => boolean)
  font?: { size?: number; weight?: string; family?: string }
  formatter?: (value: number, context?: ChartJsPluginDataLabelsContext) => string | number
  padding?: number | { top?: number; right?: number; bottom?: number; left?: number }
}

export type BarSeriesWithDatalabels = BarChartSeries & {
  dataLabels?: DataLabelOverride
}

export type ToBarChartDataInput = Omit<BarChartInput, 'series'> & {
  series: BarSeriesWithDatalabels[]
  barWidth?: number
  categoryPercentage?: number
  barPercentage?: number
  defaultLineAxis?: string
}

export type BarChartDataResult = {
  labels: string[]
  datasets: Record<string, unknown>[]
  isEmpty: boolean
}

const isSeriesEmpty = (values: number[] | Record<string, number> | undefined): boolean => {
  if (!values) return true

  if (Array.isArray(values)) {
    return _isEmpty(values) || values.every((v) => v === 0)
  }

  const vals = Object.values(values)

  return _isEmpty(vals) || vals.every((v) => v === 0)
}

/**
 * Returns true when the input has no series, empty series, or all-zero values.
 * Use this to decide whether to render a chart or an empty-state placeholder.
 */
export const isBarChartEmpty = (input: Pick<ToBarChartDataInput, 'series'>): boolean => {
  if (!input.series || _isEmpty(input.series)) return true

  return input.series.every((s) => isSeriesEmpty(s.values))
}

/**
 * Convert reporting-tool hook output into Chart.js `{ labels, datasets }`
 * accepted by the core `BarChart` component, with optional per-dataset
 * dataLabels overrides (formatter, anchor, align, offset, font, padding).
 */
export const toBarChartData = (input: ToBarChartDataInput): BarChartDataResult => {
  const { series = [], ...rest } = input

  const cleanSeries: BarChartSeries[] = series.map(({ dataLabels: _dl, ...s }) => s)

  const base = buildBarChartData({ ...rest, series: cleanSeries })

  const datasets = base.datasets.map((dataset, i) => {
    const dataLabels = series[i]?.dataLabels

    if (!dataLabels) return dataset

    return { ...dataset, datalabels: dataLabels }
  })

  return {
    labels: base.labels,
    datasets,
    isEmpty: isBarChartEmpty({ series }),
  }
}
