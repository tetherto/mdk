import { type ChartTooltipConfig, CURRENCY, UNITS } from '@primitives'

import {
  btcBarLabelFormatter,
  type DisplayMode,
  usdBarLabelFormatterWithDecimals,
} from './build-energy-balance-view-model'

/** Chart height when the downtime panel fills a mosaic cell. */
export const ENERGY_BALANCE_MOSAIC_FILL_CHART_HEIGHT = 320
/** Default height for the power consumption line chart. */
export const ENERGY_BALANCE_POWER_CHART_HEIGHT = 280

/** Tooltip formatter for energy per MW charts, keyed off USD vs BTC display mode. */
export const energyPerMwTooltip = (displayMode: DisplayMode): ChartTooltipConfig => ({
  valueFormatter: (value) =>
    displayMode === CURRENCY.USD_LABEL
      ? `${usdBarLabelFormatterWithDecimals(value)} ${CURRENCY.USD_LABEL}/${UNITS.ENERGY_MWH}`
      : `${btcBarLabelFormatter(value)} ${CURRENCY.BTC_LABEL}/${UNITS.ENERGY_MWH}`,
})

/** Tooltip formatter for energy cost bars; uses custom BTC unit label when not in USD mode. */
export const energyCostChartTooltip = (
  displayMode: DisplayMode,
  btcUnit: string | null,
  barLabelFormatter: (value: number) => string,
): ChartTooltipConfig => ({
  valueFormatter: (value) =>
    displayMode === CURRENCY.USD_LABEL
      ? `${usdBarLabelFormatterWithDecimals(value)} ${CURRENCY.USD_LABEL}/${UNITS.ENERGY_MWH}`
      : `${barLabelFormatter(value)} ${btcUnit ?? CURRENCY.BTC_LABEL}/${UNITS.ENERGY_MWH}`,
})
