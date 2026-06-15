import { CHART_COLORS, CURRENCY, formatValueUnit } from '@core'

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
