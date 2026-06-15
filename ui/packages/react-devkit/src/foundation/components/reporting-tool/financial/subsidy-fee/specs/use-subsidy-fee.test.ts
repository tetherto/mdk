import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PERIOD } from '@/constants/ranges'
import type { SubsidyFeesResponse } from '@/types/finance'
import { useSubsidyFees } from '../use-subsidy-fee'

const response: SubsidyFeesResponse = {
  log: [
    {
      ts: new Date('2026-05-09T12:00:00Z').getTime(),
      blockReward: 312_500_000,
      blockTotalFees: 12_500_000,
      avgFeesSatsVByte: 0.27,
    },
    {
      ts: new Date('2026-05-10T12:00:00Z').getTime(),
      blockReward: 312_500_000,
      blockTotalFees: 25_000_000,
      avgFeesSatsVByte: 0.3,
    },
  ],
  summary: {
    totalBlockReward: 625_000_000,
    totalBlockTotalFees: 37_500_000,
    avgBlockReward: 312_500_000,
    avgBlockTotalFees: 18_750_000,
  },
}

describe('useSubsidyFees', () => {
  it('maps injected SubsidyFeesResponse into both chart datasets', () => {
    const { result } = renderHook(() =>
      useSubsidyFees({
        data: response,
        dateRange: {
          start: new Date('2026-05-09T00:00:00Z').getTime(),
          end: new Date('2026-05-10T23:59:59Z').getTime(),
          period: PERIOD.DAILY,
        },
      }),
    )

    expect(result.current.isEmpty).toBe(false)
    expect(result.current.aggregatedData).toHaveLength(2)
    expect(result.current.subsidyFeesChartData.datasets).toHaveLength(3)
    expect(result.current.averageFeesChartData.datasets).toHaveLength(1)
    expect(result.current.summary.totalFeesBTC).toBe(0.375)
  })

  it('filters injected logs by the selected date range', () => {
    const { result } = renderHook(() =>
      useSubsidyFees({
        data: response,
        dateRange: {
          start: new Date('2026-05-10T00:00:00Z').getTime(),
          end: new Date('2026-05-10T23:59:59Z').getTime(),
          period: PERIOD.DAILY,
        },
      }),
    )

    expect(result.current.filteredLog).toEqual([response.log[1]])
    expect(result.current.subsidyFeesChartData.labels).toEqual(['Sun'])
  })

  it('returns an empty chart state without a date range', () => {
    const { result } = renderHook(() =>
      useSubsidyFees({
        data: response,
        dateRange: null,
      }),
    )

    expect(result.current.isEmpty).toBe(true)
    expect(result.current.subsidyFeesChartData.isEmpty).toBe(true)
    expect(result.current.averageFeesChartData.isEmpty).toBe(true)
  })
})
