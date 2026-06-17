import { type ChartTooltipConfig, formatValueUnit, UNITS } from '@core'

export const hashrateBarChartTooltip: ChartTooltipConfig = {
  valueFormatter: (value) => formatValueUnit(value, UNITS.HASHRATE_TH_S),
}
