import { CHART_COLORS, type ChartTooltipConfig, CURRENCY, formatValueUnit, UNITS } from '@core'

/** Bar chart height shared by Production Cost and Avg All-in Cost. */
export const COST_BAR_CHART_HEIGHT = 360
export const COST_DOUGHNUT_HEIGHT = 280
export const COST_BAR_WIDTH = 30

export const PRODUCTION_COST_COLOR = CHART_COLORS.green
export const BTC_PRICE_COLOR = CHART_COLORS.yellow
export const OPERATIONS_COLOR = CHART_COLORS.VIOLET
export const ENERGY_COLOR = CHART_COLORS.SKY_BLUE
/** Distinct from `OPERATIONS_COLOR` to avoid Operations and Revenue sharing the same hue on the same page. */
export const REVENUE_COLOR = CHART_COLORS.AGGR_POOL
export const COST_COLOR = CHART_COLORS.green

export const usdFormatter = (value: number): string => String(formatValueUnit(value, CURRENCY.USD))

export const operationsEnergyChartUnit = `${CURRENCY.USD}/${UNITS.ENERGY_MWH}`

/** MDK HTML tooltip for the Operations vs Energy doughnut (value + share of total). */
export const operationsEnergyDoughnutTooltip = (
  unit: string = operationsEnergyChartUnit,
): ChartTooltipConfig => ({
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
