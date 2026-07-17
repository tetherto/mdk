import { CURRENCY } from '@primitives'
import { PERIOD, TIMEFRAME_TYPE } from '../../../../../../constants/ranges'
import { describe, expect, it } from 'vitest'

import type { HashRevenueLogEntry } from '@domain/types/finance'
import { buildSiteHashRevenueChartInput } from '../hash-balance-chart.utils'
import { formatHashBalanceValue } from '../hash-balance-format.utils'
import {
  deriveHashBalanceView,
  getInitialHashBalanceDateRange,
  isWeeklyCostDisclaimer,
} from '../hash-balance-utils'

const entry = (ts: number, revenueUsd: number): HashRevenueLogEntry => ({
  ts,
  revenueBTC: 0,
  feesBTC: 0,
  revenueUSD: 0,
  feesUSD: 0,
  btcPrice: 60_000,
  hashrateMhs: 1,
  hashRevenueBTCPerPHsPerDay: 0,
  hashRevenueUSDPerPHsPerDay: revenueUsd,
  hashCostBTCPerPHsPerDay: 0,
  hashCostUSDPerPHsPerDay: 0,
  networkHashPriceBTCPerPHsPerDay: 0,
  networkHashPriceUSDPerPHsPerDay: 0.1,
  networkHashrateMhs: 1_000_000,
})

describe('hash-balance-utils', () => {
  it('defaults to the current calendar year with monthly period', () => {
    const range = getInitialHashBalanceDateRange(new Date(2026, 4, 19))
    expect(range.period).toBe(PERIOD.MONTHLY)
    expect(new Date(range.start).getFullYear()).toBe(2026)
    expect(new Date(range.end).getFullYear()).toBe(2026)
  })

  it('formats small BTC values without scientific notation', () => {
    expect(formatHashBalanceValue(0.000007, CURRENCY.BTC_LABEL)).toBe('0.00001')
    expect(formatHashBalanceValue(0.000007, CURRENCY.BTC_LABEL, { forAxis: true })).toBe('0.000007')
    expect(formatHashBalanceValue(0.000007, CURRENCY.BTC_LABEL, { forAxis: true })).not.toMatch(
      /e/i,
    )
  })

  it('builds site hash revenue series for USD', () => {
    const input = buildSiteHashRevenueChartInput(
      [entry(Date.UTC(2026, 0, 15), 0.4), entry(Date.UTC(2026, 1, 15), 0.5)],
      'month',
      CURRENCY.USD_LABEL,
    )

    expect(input.labels).toEqual(['2026-01', '2026-02'])
    expect(input.series[0]?.values).toEqual([0.4, 0.5])
  })

  it('flags weekly cost disclaimer for week timeframe', () => {
    expect(isWeeklyCostDisclaimer(TIMEFRAME_TYPE.WEEK)).toBe(true)
    expect(isWeeklyCostDisclaimer(TIMEFRAME_TYPE.YEAR)).toBe(false)
  })

  it('derives empty state when log is outside range', () => {
    const view = deriveHashBalanceView(
      { log: [entry(Date.UTC(2020, 0, 15), 1)], summary: undefined },
      undefined,
      getInitialHashBalanceDateRange(new Date(2026, 0, 1)),
      CURRENCY.USD_LABEL,
    )

    expect(view.isEmpty).toBe(true)
  })
})
