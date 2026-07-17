import { describe, expect, it } from 'vitest'

import { PERIOD } from '@domain/constants/ranges'
import type { FinancialDateRange } from '../../../utils/financial-period'

import { buildAvgAllInCostInput } from '../avg-all-in-cost-chart-input'

const ts = (iso: string): number => new Date(iso).getTime()

const dateRange: FinancialDateRange = {
  start: ts('2025-01-01T00:00:00.000Z'),
  end: ts('2025-03-31T00:00:00.000Z'),
  period: PERIOD.MONTHLY,
}

describe('buildAvgAllInCostInput', () => {
  it('returns null when data is undefined so the consumer can render empty state', () => {
    expect(buildAvgAllInCostInput({ data: undefined, dateRange })).toBeNull()
  })

  it('returns null when data is an empty array', () => {
    expect(buildAvgAllInCostInput({ data: [], dateRange })).toBeNull()
  })

  it('builds revenue and cost series aligned to period-bucketed labels', () => {
    const input = buildAvgAllInCostInput({
      data: [
        { ts: ts('2025-01-15T00:00:00.000Z'), revenueUSDPerMWh: 22, costUSDPerMWh: 17 },
        { ts: ts('2025-02-15T00:00:00.000Z'), revenueUSDPerMWh: 24, costUSDPerMWh: 18 },
      ],
      dateRange,
    })

    expect(input).not.toBeNull()
    expect(input?.labels).toEqual(['2025-01', '2025-02'])
    expect(input?.series.map((s) => s.label)).toEqual(['Revenue', 'Cost'])
    expect(input?.series[0]?.values).toEqual([22, 24])
    expect(input?.series[1]?.values).toEqual([17, 18])
  })

  it('sorts the input data by ts so out-of-order input still renders chronologically', () => {
    const input = buildAvgAllInCostInput({
      data: [
        { ts: ts('2025-02-15T00:00:00.000Z'), revenueUSDPerMWh: 24, costUSDPerMWh: 18 },
        { ts: ts('2025-01-15T00:00:00.000Z'), revenueUSDPerMWh: 22, costUSDPerMWh: 17 },
      ],
      dateRange,
    })

    expect(input?.labels).toEqual(['2025-01', '2025-02'])
    expect(input?.series[0]?.values).toEqual([22, 24])
    expect(input?.series[1]?.values).toEqual([17, 18])
  })
})
