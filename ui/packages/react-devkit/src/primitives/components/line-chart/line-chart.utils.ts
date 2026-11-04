import { format } from 'date-fns/format'
import type {
  BarData,
  CustomData,
  HistogramData,
  ISeriesApi,
  LineData,
  SeriesType,
  Time,
} from 'lightweight-charts'
import _isNumber from 'lodash/isNumber'
import _isObject from 'lodash/isObject'
import _trim from 'lodash/trim'

import {
  MARGIN_ABOVE_FACTOR,
  MARGIN_BELOW_FACTOR,
  SCALE_MIN_PADDING,
  SCALE_PADDING_FACTOR_FOR_FLOAT,
  SCALE_PADDING_FACTOR_FOR_INT,
  TOOLTIP_DEFAULT_OFFSET,
  VISIBLE_POINTS_BY_TIMELINE,
} from './line-chart.constants'

import type { LineDataset, LineSeriesApi } from './types'

export type {
  ExtraTooltipData,
  LineChartData,
  LineDataPoint,
  LineDataset,
  LineSeriesApi,
} from './types'

export type SeriesDataMap = Map<
  ISeriesApi<SeriesType, Time>,
  BarData<Time> | LineData<Time> | HistogramData<Time> | CustomData<Time>
>

export const getTooltipPosition = (
  clientX: number,
  clientY: number,
  tooltipWidth: number,
  tooltipHeight: number,
  tooltipOffset = TOOLTIP_DEFAULT_OFFSET,
): { left: number; top: number } => {
  let left = clientX + tooltipOffset
  let top = clientY + tooltipOffset

  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  if (left + tooltipWidth > viewportWidth) {
    left = clientX - tooltipWidth - tooltipOffset
  }

  if (left < 0) {
    if (tooltipWidth > clientX && tooltipWidth > viewportWidth - clientX) {
      left = Math.max(tooltipOffset, (viewportWidth - tooltipWidth) / 2)
    } else {
      left =
        clientX > viewportWidth / 2
          ? clientX - tooltipWidth - tooltipOffset
          : clientX + tooltipOffset
    }
  }

  if (top + tooltipHeight > viewportHeight) {
    top = clientY - tooltipHeight - tooltipOffset
  }

  if (top < 0) {
    top = tooltipOffset
  }

  return { left, top }
}

export const autoscaleProvider =
  (beginAtZero: boolean) =>
  (
    original: () => {
      priceRange: { minValue: number; maxValue: number }
      margins?: { above: number; below: number }
    } | null,
  ) => {
    const res = original()
    if (!res) return res

    let { minValue, maxValue } = res.priceRange

    if (minValue === maxValue) {
      const padding = Number.isInteger(minValue)
        ? SCALE_PADDING_FACTOR_FOR_INT
        : SCALE_PADDING_FACTOR_FOR_FLOAT

      // A flat series has no range of its own, so the axis needs a synthetic
      // band around it. The band is a fraction of the value rather than a
      // fixed number of units: the chart cannot know whether the series is
      // MW, °C or TH/s, so an absolute floor swamps any series that lives
      // near zero — site power in MW (~0.035) was scaling to an axis running
      // from -1.16 to 1.24. A series sitting exactly at zero is the one case
      // with no magnitude to scale from, and the only one the absolute
      // fallback is for.
      const magnitude = Math.abs(minValue)
      const base = magnitude > 0 ? magnitude * padding : SCALE_MIN_PADDING
      minValue -= base
      maxValue += base
    }

    if (beginAtZero) {
      minValue = Math.min(0, minValue)
    }

    return {
      priceRange: { minValue, maxValue },
      margins: {
        above: MARGIN_ABOVE_FACTOR,
        below: MARGIN_BELOW_FACTOR,
      },
    }
  }

/** What the tooltip reads off a chart point, whether from the crosshair or a lookup. */
type SeriesPoint = { time?: unknown; value?: number | null }

/** A lightweight-charts `Time` as a unix timestamp, or undefined for a business day. */
const toTimestamp = (time: unknown): number | undefined => {
  if (_isNumber(time)) return time
  if (_isObject(time) && 'timestamp' in time) return (time as { timestamp: number }).timestamp
  return undefined
}

/**
 * The series' last point at or before `time`.
 *
 * `param.seriesData` holds only the series with a point at the hovered time, so
 * on a chart whose series sit on different time axes the tooltip showed one or
 * two rows out of four, changing as the pointer moved, and a reference line
 * built from two endpoints never appeared between them. Carrying the last known
 * value forward is what a reader expects a shared crosshair to report.
 *
 * Read through `series.data()` rather than the source dataset: the series holds
 * points already converted to chart time (`(x + tzOffset) / 1000`) and rounded,
 * so there is no unit or precision to reapply here. It is time-ascending, hence
 * the binary search rather than a scan on every mouse move.
 */
const pointAtOrBefore = (series: LineSeriesApi, time: number): SeriesPoint | undefined => {
  const data = series.data()
  let low = 0
  let high = data.length - 1
  let found: SeriesPoint | undefined

  while (low <= high) {
    const mid = (low + high) >> 1
    const midTime = toTimestamp(data[mid]?.time)
    if (midTime === undefined) return undefined
    if (midTime <= time) {
      found = data[mid] as SeriesPoint
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  return found
}

type BuildTooltipParams = {
  seriesData: SeriesDataMap
  seriesToDatasetMap: Map<LineSeriesApi, LineDataset>
  yTicksFormatter?: (value: number) => string
  unit?: string
  customLabel?: string
  showDateInTooltip?: boolean
  skipMinWidth?: boolean
}

export const buildTooltipHTML = ({
  seriesData,
  seriesToDatasetMap,
  yTicksFormatter,
  unit = '',
  customLabel,
  showDateInTooltip = false,
  skipMinWidth = false,
}: BuildTooltipParams): string => {
  let tooltipHTML = ''
  let extraTooltipHTML = ''

  // The time the crosshair is on, taken from whichever series does have a point
  // there. Every other series is then read at that same time.
  let hoveredTime: number | undefined
  for (const point of seriesData.values()) {
    hoveredTime = toTimestamp(point?.time)
    if (hoveredTime !== undefined) break
  }

  // Iterate the datasets, not `seriesData`: every series gets a row, in the
  // order they were declared, rather than only those with a point at this
  // exact time and in whatever order the map happened to hold them.
  for (const [series, dataset] of seriesToDatasetMap.entries()) {
    if (!dataset || dataset.visible === false) continue

    const point =
      seriesData.get(series) ??
      (hoveredTime === undefined ? undefined : pointAtOrBefore(series, hoveredTime))

    if (point === undefined || point === null) continue
    if (!('value' in point) || point.value === undefined || point.value === null) continue

    const { label, borderColor, extraTooltipData } = dataset
    const value = point.value

    const timestamp = toTimestamp(point?.time)

    const formattedValue = yTicksFormatter ? yTicksFormatter(value) : String(value)
    const valueWithUnit =
      unit && !formattedValue.includes(unit) ? `${formattedValue} ${unit}` : formattedValue

    tooltipHTML += `
      <div style="
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        line-height: 16px;
        margin-bottom: ${skipMinWidth ? 'unset' : '12px'};
        gap: ${skipMinWidth ? '8px' : 'unset'};
      ">
        ${
          showDateInTooltip && timestamp
            ? `<span>${format(new Date(timestamp * 1000), 'MM-dd-yyyy')}</span>`
            : ''
        }
        <span style="margin-right: 8px;">${label || customLabel || ''}</span>
        <span style="color: ${borderColor}">${valueWithUnit}</span>
      </div>
    `

    if (!extraTooltipHTML && timestamp && extraTooltipData?.[timestamp]) {
      const content = extraTooltipData[timestamp]
      if (content) {
        extraTooltipHTML = content
      }
    }
  }

  return _trim(tooltipHTML + extraTooltipHTML)
}

export const getVisibleDataPointsForTimeline = (timeline: string): number =>
  VISIBLE_POINTS_BY_TIMELINE[timeline] ?? 24
