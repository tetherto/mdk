import { BAR_CHART_ITEM_BORDER_COLORS, type ChartTooltipConfig, COLOR, CURRENCY } from '@core'

import { formatHashBalanceTooltipPhDay } from './hash-balance-format.utils'

export const HASH_BALANCE_COLORS = {
  panelBackground: COLOR.BLACK_ALPHA_05,
  siteHashRevenueUsd: BAR_CHART_ITEM_BORDER_COLORS.BLUE,
  siteHashRevenueBtc: BAR_CHART_ITEM_BORDER_COLORS.RED,
  networkHashprice: BAR_CHART_ITEM_BORDER_COLORS.PURPLE,
  networkHashrateLine: COLOR.COLD_ORANGE,
  costHashCost: BAR_CHART_ITEM_BORDER_COLORS.BLUE,
  costHashRevenue: BAR_CHART_ITEM_BORDER_COLORS.RED,
  costNetworkHashprice: BAR_CHART_ITEM_BORDER_COLORS.GREEN,
} as const

export const HASH_BALANCE_TIMEFRAME_HINT = 'Select a period in one of the timeframes'

export const HASH_BALANCE_BAR_CHART_HEIGHT = 320
export const HASH_BALANCE_LINE_CHART_HEIGHT = 280
export const HASH_BALANCE_BAR_WIDTH = 45
export const HASH_BALANCE_NETWORK_HASHRATE_LINE_WIDTH = 1.5

export const hashBalanceBarChartScalesXY = {
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

export const hashBalancePhDayTooltip = (currencyLabel: string): ChartTooltipConfig => ({
  valueFormatter: (value) => formatHashBalanceTooltipPhDay(value, currencyLabel),
})

export const hashRevenueLegendLabel = (currencyLabel: string): string =>
  `Hash Revenue (${currencyLabel})`

export const networkHashpriceLegendLabel = (currencyLabel: string): string =>
  `Bitcoin Network Hashprice (${currencyLabel})`

export const hashCostLegendLabel = (): string => `Hash Cost (${CURRENCY.USD_LABEL})`

export const hashRevenueUsdLegendLabel = (): string => `Hash Revenue (${CURRENCY.USD_LABEL})`

export const networkHashpriceUsdLegendLabel = (): string =>
  `Network Hashprice (${CURRENCY.USD_LABEL})`
