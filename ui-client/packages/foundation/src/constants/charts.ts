// Import shared chart constants from core
import {
  CHART_LEGEND_OPACITY,
  CHART_PERFORMANCE,
  defaultChartColors,
  getChartAnimationConfig,
  getDataDecimationConfig,
  LABEL_TO_IGNORE,
} from '@tetherto/core'

// Re-export shared constants
export {
  CHART_LEGEND_OPACITY,
  CHART_PERFORMANCE,
  defaultChartColors,
  getChartAnimationConfig,
  getDataDecimationConfig,
  LABEL_TO_IGNORE,
}

// Foundation-specific chart constants
export const CHART_LABELS = {
  HASHRATE: 'Hashrate',
  EFFICIENCY: 'Efficiency',
} as const

export const CHART_TYPES = {
  MINER: 'miner',
  MINERPOOL: 'minerpool',
  POWERMETER: 'powermeter',
  CONTAINER: 'container',
  ELECTRICITY: 'electricity',
} as const

export const CHART_TITLES = {
  HASH_RATE: 'Hash Rate',
  POWER_CONSUMPTION: 'Power Consumption',
  POWER_CONSUMED: 'Power Consumed',
  REACTIVE_ENERGY: 'Reactive Energy',
  TANK_OIL_TEMP: 'Tank TANK_NUMBER Temperature',
  TANK_PRESSURE: 'Tank Pressure',
  SPOT_PRICE: 'Spot Price',
  EFFICIENCY: 'Efficiency',
  MINERS_ONLINE: 'Miners Online',
  REALTIME_CONSUMPTION: 'Realtime Consumption',
  HASH_RATE_BY_MINER_TYPE: 'Hash Rate By Miner Type',
  POWER_MODE_TIMELINE: 'Power Mode Timeline',
} as const

export const CHART_EMPTY_DESCRIPTION = 'No data available at the moment'

// Type exports (foundation-specific)
export type ChartLabelKey = keyof typeof CHART_LABELS
export type ChartLabelValue = (typeof CHART_LABELS)[ChartLabelKey]
export type ChartTypeKey = keyof typeof CHART_TYPES
export type ChartTypeValue = (typeof CHART_TYPES)[ChartTypeKey]
export type ChartTitleKey = keyof typeof CHART_TITLES
export type ChartTitleValue = (typeof CHART_TITLES)[ChartTitleKey]

// Re-export core chart types
export type {
  ChartLegendOpacityKey,
  ChartLegendOpacityValue,
  ChartPerformanceKey,
  LabelToIgnoreValue,
} from '@tetherto/core'
