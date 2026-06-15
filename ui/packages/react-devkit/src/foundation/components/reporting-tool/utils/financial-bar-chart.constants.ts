import {
  CHART_COLORS,
  type ChartTooltipConfig,
  COLOR,
  CURRENCY,
  formatValueUnit,
  UNITS,
} from '@core'

/** Shared axis styling for financial reporting bar charts (Subsidy/Fee, Hash Balance, Cost, EBITDA, Energy). */
export const financialBarChartScalesXY = {
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
    grid: { display: true, color: CHART_COLORS.gridLine },
    ticks: { color: COLOR.WHITE_ALPHA_07, padding: 8 },
  },
} as const

/** Tooltip values as USD only — use for EBITDA, production cost, and other dollar-denominated bar series. */
export const usdChartTooltip: ChartTooltipConfig = {
  valueFormatter: (value) => String(formatValueUnit(value, CURRENCY.USD)),
}

/** Tooltip values as BTC only — use for bitcoin-denominated financial bar series (e.g. bitcoin produced). */
export const btcChartTooltip: ChartTooltipConfig = {
  valueFormatter: (value) => String(formatValueUnit(value, CURRENCY.BTC)),
}

/** Tooltip values as USD per MWh (`value/MWh`) — use for energy cost and revenue per MWh bar charts. */
export const usdPerMwhChartTooltip: ChartTooltipConfig = {
  valueFormatter: (value) => `${String(formatValueUnit(value, CURRENCY.USD))}/${UNITS.ENERGY_MWH}`,
}
