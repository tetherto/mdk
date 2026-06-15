import type { CurrencyUsdBtcCell } from '../site-details.types'

export type HashRevenueTotals = {
  usdSum: number
  phsSum: number
}

export type HashRevenueBucket = {
  ts: number
  _all: HashRevenueTotals
  [regionName: string]: CurrencyUsdBtcCell | HashRevenueTotals | number | undefined
}
