import { FALLBACK, formatNumber, UNITS } from '@core'
import _replace from 'lodash/replace'
import _toLower from 'lodash/toLower'

import { formatPowerConsumption } from '@/utils/device-utils'

export const getEfficiencyString = (value: number): string => `${formatNumber(value)} J/TH`

export const getConsumptionString = (value: number): string => {
  const { value: scaled, unit } = formatPowerConsumption(value, UNITS.POWER_W)
  if (scaled == null) return FALLBACK
  return `${formatNumber(scaled)} ${unit}`.trim()
}

export const sanitizeFileName = (location: string): string =>
  _toLower(_replace(location, /\s+/g, '-'))
