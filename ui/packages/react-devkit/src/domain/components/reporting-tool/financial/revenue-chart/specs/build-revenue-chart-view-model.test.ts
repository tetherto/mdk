import { CURRENCY } from '@primitives'
import { describe, expect, it } from 'vitest'

import { buildRevenueChartViewModel } from '../build-revenue-chart-view-model'
import type { RevenueDataItem } from '../revenue-chart.types'

const SITE_LIST = [
  { id: 'site-a', name: 'Alpha' },
  { id: 'site-b', name: 'Beta' },
]

const BTC_DATA: RevenueDataItem[] = [
  { timeKey: 'Jan 2024', period: 'monthly', timestamp: 1704067200000, 'site-a': 2.5, 'site-b': 1.8 },
  { timeKey: 'Feb 2024', period: 'monthly', timestamp: 1706745600000, 'site-a': 3.1, 'site-b': 2.2 },
]

const SATS_DATA: RevenueDataItem[] = [
  { timeKey: 'Jan 2024', period: 'monthly', timestamp: 1704067200000, 'site-a': 0.004, 'site-b': 0.003 },
  { timeKey: 'Feb 2024', period: 'monthly', timestamp: 1706745600000, 'site-a': 0.005, 'site-b': 0.002 },
]

describe('buildRevenueChartViewModel', () => {
  it('returns BTC currencyUnit when values are > 1', () => {
    const { currencyUnit } = buildRevenueChartViewModel(BTC_DATA, SITE_LIST)
    expect(currencyUnit).toBe(CURRENCY.BTC)
  })

  it('returns Sats currencyUnit when values are <= 1', () => {
    const { currencyUnit } = buildRevenueChartViewModel(SATS_DATA, SITE_LIST)
    expect(currencyUnit).toBe(CURRENCY.SATS)
  })

  it('produces chart labels matching the time periods', () => {
    const { chartInput } = buildRevenueChartViewModel(BTC_DATA, SITE_LIST)
    expect(chartInput.labels).toContain('Jan 2024')
    expect(chartInput.labels).toContain('Feb 2024')
  })

  it('produces one series per site', () => {
    const { chartInput } = buildRevenueChartViewModel(BTC_DATA, SITE_LIST)
    expect(chartInput.series).toHaveLength(2)
  })

  it('uses site display names as series labels', () => {
    const { chartInput } = buildRevenueChartViewModel(BTC_DATA, SITE_LIST)
    const labels = chartInput.series.map((seriesItem) => seriesItem.label)
    expect(labels).toContain('Alpha')
    expect(labels).toContain('Beta')
  })

  it('returns empty labels and series for empty data', () => {
    const { chartInput, currencyUnit } = buildRevenueChartViewModel([], SITE_LIST)
    expect(chartInput.labels).toHaveLength(0)
    expect(chartInput.series).toHaveLength(0)
    expect(currencyUnit).toBe(CURRENCY.BTC)
  })

  it('works without a siteList argument', () => {
    const { chartInput } = buildRevenueChartViewModel(BTC_DATA)
    expect(chartInput.series).toHaveLength(2)
  })
})
