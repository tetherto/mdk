import { CHART_COLORS, type ChartTooltipConfig, COLOR, CURRENCY, UNITS } from '@core'

export const SUBSIDY_FEE_CHART_HEIGHT = 250
export const SUBSIDY_FEE_TIMEFRAME_HINT = 'Select a period in one of the timeframes'

export const subsidyFeesTooltip: ChartTooltipConfig = {
  valueFormatter: (value, item) =>
    item.dataset.yAxisID === 'y1'
      ? `${value.toFixed(2)}${UNITS.PERCENT}`
      : `${value.toFixed(2)} ${CURRENCY.BTC_LABEL}`,
}

export const averageFeesTooltip: ChartTooltipConfig = {
  valueFormatter: (value) => `${value.toFixed(2)} ${UNITS.SATS}/${UNITS.VBYTE}`,
}

export const subsidyFeeBarChartScalesXY = {
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
