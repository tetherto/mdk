import { type ChartTooltipConfig, formatValueUnit, UNITS } from '@primitives'

export const hashrateBarChartTooltip: ChartTooltipConfig = {
  valueFormatter: (value) => formatValueUnit(value, UNITS.HASHRATE_TH_S),
}
