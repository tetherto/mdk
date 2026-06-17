import _isFinite from 'lodash/isFinite'
import _isNumber from 'lodash/isNumber'
import _some from 'lodash/some'

import { COLOR } from '../../constants/colors'
import type { LineChartData, LineDataPoint } from '../line-chart/types'
import type { ThresholdLineChartData, ThresholdLineChartPoint } from './types'

import { SERIES_COLORS, THRESHOLD_COLORS } from './constants'

const parseTimestamp = (ts: string | number | undefined): number => {
  if (ts === undefined) return Number.NaN
  if (_isNumber(ts)) return ts

  const parsed = Date.parse(ts)

  return _isFinite(parsed) ? parsed : Number.NaN
}

const pointTimestamp = (point: ThresholdLineChartPoint): number => parseTimestamp(point.timestamp)

const sortByTime = (points: LineDataPoint[]): LineDataPoint[] =>
  [...points].sort((a, b) => (a.x as number) - (b.x as number))

const getSeriesColor = (index: number): string =>
  SERIES_COLORS[index % SERIES_COLORS.length] ?? COLOR.ORANGE_WARNING

const getThresholdColor = (index: number): string =>
  THRESHOLD_COLORS[index % THRESHOLD_COLORS.length] ?? COLOR.GRASS_GREEN

/** Union of every finite timestamp across all series, sorted ascending (used for threshold lines). */
const collectChartTimestamps = (data: ThresholdLineChartData): number[] => {
  const timestamps = new Set<number>()

  for (const { points } of data.series) {
    for (const point of points) {
      const x = pointTimestamp(point)
      if (_isFinite(x)) timestamps.add(x)
    }
  }

  return [...timestamps].sort((a, b) => a - b)
}

/**
 * True when `data` has at least one series point with a non-zero value (drives empty state).
 *
 * @category charts
 * @domain generic
 * @tier agent-ready
 */
export const hasNonZeroData = (data?: ThresholdLineChartData): boolean =>
  _some(data?.series, ({ points }) => _some(points, ({ value }) => value !== 0))

/**
 * Maps `ThresholdLineChartData` to `LineChartData` datasets (series plus horizontal thresholds).
 *
 * @category charts
 * @domain generic
 * @tier agent-ready
 */
export const toThresholdLineChartData = (data: ThresholdLineChartData): LineChartData => {
  const timestamps = collectChartTimestamps(data)

  return {
    datasets: [
      ...data.series.map(({ label, color, points }, index) => ({
        label,
        borderColor: color ?? getSeriesColor(index),
        data: sortByTime(
          points
            .map((point) => ({
              x: pointTimestamp(point),
              y: point.value,
            }))
            .filter((point) => _isFinite(point.x)),
        ),
      })),
      ...(data.thresholds?.map(({ label, color, value }, index) => ({
        label,
        borderColor: color ?? getThresholdColor(index),
        data: sortByTime(timestamps.map((ts) => ({ x: ts, y: value }))),
      })) ?? []),
    ],
  }
}
