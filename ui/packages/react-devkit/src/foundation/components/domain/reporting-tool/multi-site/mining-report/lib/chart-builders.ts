import _isFinite from 'lodash/isFinite'

import { tsToISO } from './mining-utils'

import { CHART_COLORS, formatNumber } from '@core'

/**
 * Chart builder types
 */
export type GradientConfig = {
  top: number
  bottom: number
}

export type DataLabelsConfig = {
  display: boolean
  formatter?: (value: number) => string
}

export type ChartPoint = {
  ts: string
  value: number
}

export type ChartSeries = {
  label: string
  values: number[]
  color: string
  gradient?: GradientConfig
  datalabels?: DataLabelsConfig
  [key: string]: unknown
}

export type LineChartSeries = {
  label: string
  points: ChartPoint[]
  color: string
  [key: string]: unknown
}

export type ChartConstant = {
  label: string
  value: number
  color: string
}

export type BarChartData = {
  labels: string[]
  series: ChartSeries[]
  lines?: ChartSeries[]
}

export type LineChartData = {
  series: LineChartSeries[]
  constants: ChartConstant[]
}

export type SeriesInput = {
  label: string
  values: number[]
  color: string
  options?: Record<string, unknown>
}

export type SeriesInputInput = Omit<SeriesInput, 'color'> & { color?: string }

export type LineSeriesInput = {
  label: string
  data: Array<{ ts: number | string; value: number }>
  color: string
  options?: Record<string, unknown>
}

export type LineSeriesInputInput = Omit<LineSeriesInput, 'color'> & { color?: string }

export type ConstantInput = {
  label: string
  value: number
  color: string
}

export type ConstantInputInput = Omit<ConstantInput, 'color'> & { color?: string }

const CHART_COLOR_PALETTE: string[] = [
  CHART_COLORS.blue,
  CHART_COLORS.red,
  CHART_COLORS.green,
  CHART_COLORS.orange,
  CHART_COLORS.VIOLET,
  CHART_COLORS.purple,
  CHART_COLORS.yellow,
  CHART_COLORS.SKY_BLUE,
]

export const resolveChartColor = (color: string | undefined, index = 0): string =>
  color ?? CHART_COLOR_PALETTE[index % CHART_COLOR_PALETTE.length] ?? CHART_COLORS.blue

export type RevenueSeriesConfig = {
  allInCost?: number[]
  hashRevenue?: number[]
  networkHashprice?: number[]
}

export const formatDataLabel = (value: number) => {
  if (_isFinite(value)) {
    if (value === 0) {
      return '0'
    }

    const valueAbs = Math.abs(value)

    if (valueAbs > 0 && valueAbs < 1) {
      return formatNumber(value, { minimumSignificantDigits: 1, maximumSignificantDigits: 3 })
    }
  }

  return formatNumber(value)
}

export const DEFAULT_GRADIENT: GradientConfig = { top: 0.3, bottom: 0.1 }
export const DEFAULT_DATALABELS: DataLabelsConfig = {
  display: true,
  formatter: formatDataLabel,
}

/**
 * Create a standard chart series object
 */
export const buildSeries = (
  label: string,
  values: number[],
  color: string,
  options: Record<string, unknown> = {},
): ChartSeries => ({
  label,
  values,
  color,
  gradient: (options.gradient as GradientConfig) || DEFAULT_GRADIENT,
  datalabels: (options.datalabels as DataLabelsConfig) || DEFAULT_DATALABELS,
  ...options,
})

/**
 * Create a line chart series with points
 */
export const buildLineSeries = (
  label: string,
  data: Array<{ ts: number | string; value: number }>,
  color: string,
  options: Record<string, unknown> = {},
): LineChartSeries => ({
  label,
  points: data.map((item) => ({
    ts: tsToISO(item.ts),
    value: item.value,
  })),
  color,
  ...options,
})

/**
 * Create a chart constant (horizontal line)
 */
export const buildConstant = (label: string, value: number, color: string): ChartConstant => ({
  label,
  value,
  color,
})

/**
 * Build a standard revenue/cost chart with multiple series
 */
export const buildBarChart = (labels: string[], seriesData: SeriesInputInput[]): BarChartData => ({
  labels,
  series: seriesData.map((s, i) =>
    buildSeries(s.label, s.values, resolveChartColor(s.color, i), s.options),
  ),
})

/**
 * Build a line chart with constants
 */
export const buildLineChart = (
  seriesData: LineSeriesInputInput[],
  constantsData: ConstantInputInput[] = [],
): LineChartData => ({
  series: seriesData.map((s, i) =>
    buildLineSeries(s.label, s.data, resolveChartColor(s.color, i), s.options),
  ),
  constants: constantsData.map((c, i) =>
    buildConstant(c.label, c.value, resolveChartColor(c.color, i)),
  ),
})

/**
 * Build hashrate chart structure
 */
export const buildHashrateChart = (
  hashrateData: Array<{ ts: number | string; value: number }>,
  nominalHashrate: number,
  options: { seriesLabel?: string; constantLabel?: string } = {},
): LineChartData => {
  const seriesLabel = options.seriesLabel || 'Daily Average Hashrate'
  const constantLabel = options.constantLabel || 'Installed Nominal Hashrate'

  return buildLineChart(
    [
      {
        label: seriesLabel,
        data: hashrateData,
        color: CHART_COLORS.blue,
      },
    ],
    [
      {
        label: constantLabel,
        value: nominalHashrate,
        color: CHART_COLORS.red,
      },
    ],
  )
}

/**
 * Build efficiency chart structure
 */
export const buildEfficiencyChart = (
  efficiencyData: Array<{ ts: number | string; value: number }>,
  nominalEfficiency: number,
): LineChartData =>
  buildLineChart(
    [
      {
        label: 'Actual Sites Efficiency',
        data: efficiencyData,
        color: CHART_COLORS.blue,
      },
    ],
    [
      {
        label: 'Nominal Miners Efficiency',
        value: nominalEfficiency,
        color: CHART_COLORS.red,
      },
    ],
  )

/**
 * Build revenue comparison chart
 */
export const buildRevenueChart = (
  labels: string[],
  seriesConfig: RevenueSeriesConfig,
): BarChartData => {
  const defaultSeries = [
    { key: 'allInCost' as const, label: 'All-in Hash Cost', color: CHART_COLORS.blue },
    { key: 'hashRevenue' as const, label: 'Hash Revenue', color: CHART_COLORS.red },
    { key: 'networkHashprice' as const, label: 'Network Hashprice', color: CHART_COLORS.green },
  ]

  const series: SeriesInput[] = defaultSeries.map((seriesEntry) => ({
    label: seriesEntry.label,
    values: seriesConfig[seriesEntry.key] || [],
    color: seriesEntry.color,
  }))

  return buildBarChart(labels, series)
}

/**
 * Create empty chart structure
 */
export const createEmptyChart = (
  requiredFields: string[],
): Record<string, { labels: string[]; series: ChartSeries[] }> => {
  const empty: Record<string, { labels: string[]; series: ChartSeries[] }> = {}
  requiredFields.forEach((field) => {
    empty[field] = { labels: [], series: [] }
  })
  return empty
}

export const EMPTY_STRUCTURES = {
  hashCosts: {
    revCostHashprice: { labels: [], series: [] },
    hashrate: { series: [], constants: [] },
    hashCostMetrics: [],
  },
  hashRevenues: {
    siteHashUSD: { labels: [], series: [] },
    siteHashBTC: { labels: [], series: [] },
    networkHashrate: { series: [], constants: [] },
    networkHashprice: { labels: [], series: [] },
    hashMetrics: [],
  },
  operations: {
    hashrate: { series: [], constants: [] },
    efficiency: { series: [], constants: [] },
    workers: { series: [], constants: [] },
    powerConsumption: { series: [], constants: [] },
  },
  dailyHashrate: {
    hashpriceChart: { series: [], constants: [] },
    dailyHashrateChart: { series: [], constants: [] },
    metrics: [],
  },
  efficiency: { series: [], constants: [] },
  costSummary: {
    btcProdCost: { labels: [], series: [] },
    avgDowntime: { labels: [], series: [] },
    powerCost: { labels: [], series: [] },
    metrics: [],
  },
  energyCosts: {
    energyMetrics: [],
    revenueVsCost: { labels: [], series: [] },
    powerSeries: { series: [], constants: [] },
    units: { revenueCostUnit: '$/bucket' },
  },
  ebitda: {
    ebitdaChart: { labels: [], series: [] },
    btcProducedChart: { labels: [], series: [] },
    ebitdaMetrics: [],
  },
  powerConsumption: { series: [], constants: [] },
  subsidyVSFees: {
    subsidyFees: { labels: [], series: [], lines: [] },
    avgFeesSats: { labels: [], series: [] },
  },
  energyRevenues: {
    siteRevenueUSD: { labels: [], series: [] },
    siteRevenueBTC: { labels: [], series: [] },
    avgDowntime: { labels: [], series: [] },
    powerSeries: { series: [], constants: [] },
    downtimeMetrics: [],
  },
  workers: { series: [], constants: [] },
}
