import type { IChartApi, ISeriesApi, Time } from 'lightweight-charts'
import type { MutableRefObject } from 'react'

export type { IChartApi } from 'lightweight-charts'
export type LineDataPoint = { x: number; y: number | null | undefined }
export type ExtraTooltipData = Record<number, string>
/** Stroke pattern of a line series */
export type LineDashStyle = 'solid' | 'dotted' | 'dashed' | 'largeDashed' | 'sparseDotted'
export type LineDataset = {
  label?: string
  visible?: boolean
  borderColor: string
  borderWidth?: number
  /** Stroke pattern, e.g. `dashed` for a target or nominal line. Defaults to `solid` */
  lineStyle?: LineDashStyle
  extraTooltipData?: ExtraTooltipData
  data: LineDataPoint[]
}
/** Y-axis step and decimals, passed to every series as a lightweight-charts `price` format */
export type LineChartPriceFormat = {
  /** Smallest step between y values and axis ticks. Defaults to `0.01` */
  minMove?: number
  /** Decimals shown. Derived from `minMove` when unset */
  precision?: number
}
export type LineSeriesApi = ISeriesApi<'Line', Time>
export type LineChartData = {
  /** One line series per entry; `visible: false` hides a series without removing it */
  datasets: LineDataset[]
}

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
   * Name shown in the tooltip row of a series that has no `label`; a dataset's own `label` wins
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
   * Y-axis step and decimals. The default `minMove` of `0.01` leaves a series that moves less
   * than that (e.g. 0.942 to 0.945) with no y-axis labels; set e.g. `{ minMove: 0.001 }`
   */
  priceFormat?: LineChartPriceFormat
  /**
   * Bucket interval of the data (`1m`, `5m`, `30m`, `3h`, `1D`; case-sensitive). Sets how many
   * of the latest points are visible on load or when it changes (15, 12, 12, 12, 14; 24 for any
   * other key) while `shouldResetZoom` is on. Without it the whole series fits
   */
  timeline?: string
  /**
   * IANA time zone (e.g. `Europe/Berlin`) whose offset is added to every timestamp, so the
   * default UTC axis labels read as that zone's wall-clock time
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
   * `date-fns` format for axis and crosshair time labels, rendered in the browser's local time
   * zone. Without it, labels are in UTC
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
   * @default ""
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
   * Controls the height of the chart
   * @default 240
   */
  height?: number
}
