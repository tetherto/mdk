/* eslint-disable style/indent */
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
export type LineChartData = { datasets: LineDataset[] }

export type LineSeriesApi = ISeriesApi<'Line', Time>

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

      const base = Math.max(Math.abs(minValue) * padding, SCALE_MIN_PADDING)
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

  for (const [series, dataset] of seriesToDatasetMap.entries()) {
    const { label, visible, borderColor, extraTooltipData } = dataset
    if (!visible) continue

    const point = seriesData.get(series)
    const value = point && 'value' in point ? (point.value ?? 0) : 0

    const pointTime = point?.time
    let timestamp: number | undefined

    if (_isNumber(pointTime)) {
      timestamp = pointTime
    } else if (_isObject(pointTime) && 'timestamp' in pointTime) {
      timestamp = (pointTime as { timestamp: number }).timestamp
    }

    const formattedValue = yTicksFormatter ? yTicksFormatter(value) : value
    const valueWithUnit = unit ? `${formattedValue} ${unit}` : formattedValue

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

  const result = _trim(tooltipHTML + extraTooltipHTML)
  return result || '<strong>No data available</strong>'
}

export const getVisibleDataPointsForTimeline = (timeline: string): number =>
  VISIBLE_POINTS_BY_TIMELINE[timeline] ?? 24
