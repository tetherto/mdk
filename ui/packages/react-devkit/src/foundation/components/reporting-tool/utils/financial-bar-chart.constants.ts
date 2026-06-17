import { type ChartTooltipConfig, CURRENCY, formatValueUnit, UNITS } from '@core'

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
