import { CHART_COLORS, type ChartTooltipConfig, COLOR, UNITS } from '@core'

export const WATTS_TO_MW = 1_000_000
export const ENERGY_REPORT_MINER_CHART_HEIGHT = 250

export const energyReportPowerTooltip: ChartTooltipConfig = {
  valueFormatter: (value) => `${Number(value).toFixed(2)} ${UNITS.ENERGY_MW}`,
}

export const energyReportBarChartScales = {
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

export const formatEnergyReportPowerMw = (value: number): string =>
  `${value.toFixed(2)} ${UNITS.ENERGY_MW}`

export const formatEnergyReportPowerDataLabel = (value: number): string => value.toFixed(2)

export const megawattsToWatts = (megawatts: number): number => megawatts * WATTS_TO_MW

/** API grouped consumption `powerW` values are watts; chart axis uses MW. */
export const powerWattsToChartMegawatts = (powerW: number): number => powerW / WATTS_TO_MW
