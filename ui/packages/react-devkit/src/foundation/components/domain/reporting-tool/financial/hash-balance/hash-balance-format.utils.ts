import { CURRENCY, formatNumber, UNITS } from '@core'

import type { FormatHashBalanceValueOptions, HashBalanceCurrency } from './hash-balance.types'

export const hashBalanceCurrencyFromLabel = (currencyLabel: string): HashBalanceCurrency =>
  currencyLabel === CURRENCY.BTC_LABEL ? CURRENCY.BTC_LABEL : CURRENCY.USD_LABEL

export const getHashBalancePerPhDayUnit = (currency: HashBalanceCurrency): string =>
  `${currency}/${UNITS.HASHRATE_PH_S}/day`

export const getHashBalancePerPhDayUnitFromLabel = (currencyLabel: string): string =>
  `${currencyLabel}/${UNITS.HASHRATE_PH_S}/day`

export const formatHashBalanceValue = (
  value: number | null | undefined,
  currency: HashBalanceCurrency,
  options?: FormatHashBalanceValueOptions,
): string => {
  if (value == null || Number.isNaN(value)) return '0'

  if (currency === CURRENCY.BTC_LABEL) {
    return formatNumber(value, {
      maximumFractionDigits: options?.forAxis ? 8 : 5,
      notation: 'standard',
    })
  }

  return formatNumber(value, { notation: 'standard' })
}

export const formatHashBalanceTooltipPhDay = (value: number, currencyLabel: string): string =>
  `${formatHashBalanceValue(value, hashBalanceCurrencyFromLabel(currencyLabel))} ${getHashBalancePerPhDayUnitFromLabel(currencyLabel)}`
