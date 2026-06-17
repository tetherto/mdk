import { CHART_COLORS, mhsToThs, UNITS } from '@core'

export const HASHRATE_CHART_HEIGHT = 360
export const HASHRATE_BAR_WIDTH = 45

export const SITE_HASHRATE_COLOR = CHART_COLORS.METALLIC_BLUE
export const BAR_HASHRATE_COLOR = CHART_COLORS.yellow

export const HASHRATE_UNIT = UNITS.HASHRATE_TH_S

/** Display formatter for hashrate axis tick labels in TH/s. */
export const thsFormatter = (value: number): string => `${value.toFixed(2)} ${UNITS.HASHRATE_TH_S}`

/** MH/s -> TH/s - re-exported from the shared core conversion util (single-sourced). */
export { mhsToThs }
