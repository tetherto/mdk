import { type ChartTooltipConfig, COLOR, UNITS } from '@core'

import { formatDataLabel } from '../lib/chart-builders'

/** Grid / axis styling aligned with hash balance charts. */
export const miningReportBarChartScales = {
  x: {
    display: true,
    beginAtZero: true,
    border: { display: false },
    grid: { display: false, color: COLOR.GRAY },
    ticks: { color: COLOR.WHITE_ALPHA_07, maxRotation: 0 },
  },
  y: {
    display: true,
    beginAtZero: true,
    border: { display: false },
    grid: { display: true, color: COLOR.WHITE_ALPHA_012 },
    ticks: { color: COLOR.WHITE_ALPHA_07, padding: 8 },
  },
} as const

export const miningReportBarChartTooltip = (
  formatValue: (value: number) => string = formatDataLabel,
): ChartTooltipConfig => ({
  valueFormatter: (value) => formatValue(value),
})

export const miningReportDoughnutChartTooltip = (unit: string): ChartTooltipConfig => ({
  mode: 'nearest',
  intersect: true,
  valueFormatter: (value, item) => {
    const datasetValues = item.chart.data.datasets[0]?.data
    const total = Array.isArray(datasetValues)
      ? datasetValues.reduce<number>((acc, n) => acc + Number(n), 0)
      : 0
    const numericValue = Number(value)
    const pct = total > 0 ? ((numericValue / total) * 100).toFixed(2) : '0.00'

    return `${numericValue.toFixed(2)} ${unit} (${pct}${UNITS.PERCENT})`
  },
})
