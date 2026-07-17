import { describe, expect, it } from 'vitest'

import { PERIOD } from '@domain/constants/ranges'
import type { FinancialDateRange } from '../../../utils/financial-period'

import { buildProductionCostInput } from '../production-cost-chart-input'

const ts = (iso: string): number => new Date(iso).getTime()

const dateRange: FinancialDateRange = {
  start: ts('2025-01-01T00:00:00.000Z'),
  end: ts('2025-03-31T00:00:00.000Z'),
  period: PERIOD.MONTHLY,
}

describe('buildProductionCostInput', () => {
  it('uses period-bucketed labels derived from the merged timestamps', () => {
    const input = buildProductionCostInput({
      costLog: [
        {
          ts: ts('2025-01-15T00:00:00.000Z'),
          totalCostUSD: 1000,
          energyCostUSD: 700,
          operationalCostUSD: 300,
        },
        {
          ts: ts('2025-02-15T00:00:00.000Z'),
          totalCostUSD: 1200,
          energyCostUSD: 800,
          operationalCostUSD: 400,
        },
      ],
      btcPriceLog: [
        { ts: ts('2025-01-15T00:00:00.000Z'), priceUSD: 60_000 },
        { ts: ts('2025-02-15T00:00:00.000Z'), priceUSD: 61_000 },
      ],
      dateRange,
    })

    expect(input.labels).toEqual(['2025-01', '2025-02'])
  })

  it('emits one bar per series with values aligned to the shared label order', () => {
    const input = buildProductionCostInput({
      costLog: [
        {
          ts: ts('2025-01-15T00:00:00.000Z'),
          totalCostUSD: 1000,
          energyCostUSD: 700,
          operationalCostUSD: 300,
        },
        {
          ts: ts('2025-02-15T00:00:00.000Z'),
          totalCostUSD: 1200,
          energyCostUSD: 800,
          operationalCostUSD: 400,
        },
      ],
      btcPriceLog: [
        { ts: ts('2025-01-15T00:00:00.000Z'), priceUSD: 60_000 },
        { ts: ts('2025-02-15T00:00:00.000Z'), priceUSD: 61_000 },
      ],
      dateRange,
    })

    expect(input.series.map((s) => s.label)).toEqual(['Production Cost', 'BTC Price'])
    expect(input.series[0]?.values).toEqual([1000, 1200])
    expect(input.series[1]?.values).toEqual([60_000, 61_000])
  })

  it('zips by ts so reversed input order still produces correctly aligned bars', () => {
    const input = buildProductionCostInput({
      costLog: [
        {
          ts: ts('2025-02-15T00:00:00.000Z'),
          totalCostUSD: 1200,
          energyCostUSD: 800,
          operationalCostUSD: 400,
        },
        {
          ts: ts('2025-01-15T00:00:00.000Z'),
          totalCostUSD: 1000,
          energyCostUSD: 700,
          operationalCostUSD: 300,
        },
      ],
      btcPriceLog: [
        { ts: ts('2025-01-15T00:00:00.000Z'), priceUSD: 60_000 },
        { ts: ts('2025-02-15T00:00:00.000Z'), priceUSD: 61_000 },
      ],
      dateRange,
    })

    expect(input.labels).toEqual(['2025-01', '2025-02'])
    expect(input.series[0]?.values).toEqual([1000, 1200])
    expect(input.series[1]?.values).toEqual([60_000, 61_000])
  })

  it('fills missing buckets with 0 instead of dropping the BTC price bar silently', () => {
    const input = buildProductionCostInput({
      costLog: [
        {
          ts: ts('2025-01-15T00:00:00.000Z'),
          totalCostUSD: 1000,
          energyCostUSD: 700,
          operationalCostUSD: 300,
        },
        {
          ts: ts('2025-02-15T00:00:00.000Z'),
          totalCostUSD: 1200,
          energyCostUSD: 800,
          operationalCostUSD: 400,
        },
      ],
      btcPriceLog: [
        // missing Jan bucket
        { ts: ts('2025-02-15T00:00:00.000Z'), priceUSD: 61_000 },
      ],
      dateRange,
    })

    expect(input.labels).toEqual(['2025-01', '2025-02'])
    expect(input.series[0]?.values).toEqual([1000, 1200])
    expect(input.series[1]?.values).toEqual([0, 61_000])
  })

  it('returns empty labels and zero-length series when both logs are empty', () => {
    const input = buildProductionCostInput({
      costLog: [],
      btcPriceLog: [],
      dateRange,
    })

    expect(input.labels).toEqual([])
    expect(input.series[0]?.values).toEqual([])
    expect(input.series[1]?.values).toEqual([])
  })
})
