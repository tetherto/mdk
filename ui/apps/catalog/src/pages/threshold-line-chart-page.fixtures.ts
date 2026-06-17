import type { ThresholdLineChartData } from '@tetherto/mdk-react-devkit/core'
import { CHART_COLORS } from '@tetherto/mdk-react-devkit/core'

const dayMs = 86_400_000
const baseUtc = Date.UTC(2025, 0, 1)

const buildDailyPoints = (count: number, valueAt: (index: number) => number) =>
  Array.from({ length: count }, (_, index) => ({
    timestamp: new Date(baseUtc + index * dayMs).toISOString(),
    value: valueAt(index),
  }))

export const THRESHOLD_LINE_CHART_POWER: ThresholdLineChartData = {
  series: [
    {
      label: 'Power Consumption',
      color: CHART_COLORS.orange,
      points: buildDailyPoints(14, (index) => 28 + Math.sin(index / 2) * 4 + index * 0.25),
    },
  ],
  thresholds: [
    {
      label: 'Power Availability',
      value: 38,
      color: CHART_COLORS.green,
    },
  ],
}

export const THRESHOLD_LINE_CHART_MULTI_SERIES: ThresholdLineChartData = {
  series: [
    {
      label: 'Site Hashrate',
      color: CHART_COLORS.blue,
      points: buildDailyPoints(14, (index) => 420 + Math.cos(index / 3) * 30),
    },
    {
      label: 'Pool Hashrate',
      color: CHART_COLORS.purple,
      points: buildDailyPoints(14, (index) => 400 + Math.sin(index / 4) * 25),
    },
  ],
  thresholds: [
    {
      label: 'Target',
      value: 450,
      color: CHART_COLORS.red,
    },
  ],
}

export const THRESHOLD_LINE_CHART_EMPTY: ThresholdLineChartData = {
  series: [
    {
      label: 'Power Consumption',
      color: CHART_COLORS.orange,
      points: buildDailyPoints(7, () => 0),
    },
  ],
  thresholds: [],
}
