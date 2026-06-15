import type { IChartApi, ISeriesApi, Time } from 'lightweight-charts'
import type { MutableRefObject } from 'react'

export type { IChartApi } from 'lightweight-charts'
export type LineDataPoint = { x: number; y: number | null | undefined }
export type ExtraTooltipData = Record<number, string>
export type LineDataset = {
  label?: string
  visible?: boolean
  borderColor: string
  borderWidth?: number
  extraTooltipData?: ExtraTooltipData
  data: LineDataPoint[]
}
export type LineSeriesApi = ISeriesApi<'Line', Time>
export type LineChartData = { datasets: LineDataset[] }

export type LightWeightLineChartProps = {
  /**
   * Mutable ref to hold the LightWeightCharts reference
   */
  chartRef?: MutableRefObject<IChartApi | null>
  /**
   * Data of the chart
   */
  data: LineChartData
  /**
   * Callback to format ticks on y axis. If `priceFormatter` is given. It would be used instead.
   */
  yTicksFormatter?: (value: number) => string
  /**
   * TODO: Doc
   */
  customLabel?: string
  /**
   * Callback to format ticks on y axis.
   */
  priceFormatter?: (value: number) => string
  /**
   * The number of decimals to show
   */
  roundPrecision?: number
  /**
   * TODO: DOC
   */
  timeline?: string
  /**
   * Applies offset if provided, otherwise timestamps are assumed to already be in local time.
   * Otherwise, use browser's current timezone offset for consistent time display
   */
  fixedTimezone?: string
  /**
   * Wether to Reset Zoom
   */
  shouldResetZoom?: boolean
  /**
   * Prevent rounding of values
   */
  skipRound?: boolean
  /**
   * Do not enforce a min width
   */
  skipMinWidth?: boolean
  /**
   * Use a faded background
   */
  fadedBackground?: boolean
  /**
   * Background color of the chart
   */
  backgroundColor?: string
  /**
   * Custom date format
   */
  customDateFormat?: string
  /**
   * Show vertical line at mouse position
   */
  verticalLineLabelVisible?: boolean
  /**
   * Show horizontal line at mouse position
   */
  horizontalLineLabelVisible?: boolean
  /**
   * Show date line in tooltip
   */
  showDateInTooltip?: boolean
  /**
   * Disable automatically determining range
   */
  disableAutoRange?: boolean
  /**
   * Changes horizontal scale marks generation. With this flag equal to true, marks of the same weight are either all drawn or none are drawn at all.
   */
  uniformDistribution?: boolean
  /**
   * The unit to display with values
   */
  unit?: string
  /**
   * Starts the value axis at 0
   */
  beginAtZero?: boolean
  /**
   * Show a marker on the line
   */
  showPointMarkers?: boolean
  /**
   * Controls the height of the chart. Default: 240
   */
  height?: number
}
