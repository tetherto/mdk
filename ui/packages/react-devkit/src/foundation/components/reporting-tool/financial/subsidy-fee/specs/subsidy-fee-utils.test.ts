import { describe, expect, it } from 'vitest'

import { PERIOD } from '@/constants/ranges'
import type { SubsidyFeesLogEntry, SubsidyFeesTotals } from '@/types/finance'
import { rangeOfMonth } from '../../../timeframe-controls/timeframe-controls.helper'
import {
  filterLogByDateRange,
  getInitialSubsidyFeeDateRange,
  mapLogToPeriodData,
  summarizeSubsidyFees,
  transformToAverageFeesChartData,
  transformToSubsidyFeesChartData,
} from '../subsidy-fee-utils'

const log: SubsidyFeesLogEntry[] = [
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
]

describe('subsidy-fee-utils', () => {
  describe('getInitialSubsidyFeeDateRange', () => {
    it('matches rangeOfMonth for the given anchor date with daily period', () => {
      const now = new Date(2026, 4, 14, 12, 0, 0, 0)
      const [start, end] = rangeOfMonth(2026, 4)
      const result = getInitialSubsidyFeeDateRange(now)

      expect(result.start).toBe(start.getTime())
      expect(result.end).toBe(end.getTime())
      expect(result.period).toBe(PERIOD.DAILY)
    })
  })

  describe('filterLogByDateRange', () => {
    it('returns no rows until a date range is selected', () => {
      expect(filterLogByDateRange(log, null)).toEqual([])
    })

    it('keeps entries inside the inclusive range', () => {
      const result = filterLogByDateRange(log, {
        start: new Date('2026-05-09T00:00:00Z').getTime(),
        end: new Date('2026-05-09T23:59:59Z').getTime(),
        period: PERIOD.DAILY,
      })

      expect(result).toEqual([log[0]])
    })
  })

  describe('mapLogToPeriodData', () => {
    it('converts sats into BTC and derives fee percentage', () => {
      const result = mapLogToPeriodData(log, 'day')

      expect(result[0]).toMatchObject({
        period: 'Sat',
        subsidyBTC: 3,
        feesBTC: 0.125,
        feePercent: 4,
        avgSatsPerVByte: 0.27,
        firstTs: log[0]?.ts,
      })
    })

    it('clamps negative subsidy to zero and defaults missing avg fees', () => {
      const result = mapLogToPeriodData(
        [{ ts: log[0]!.ts, blockReward: 1, blockTotalFees: 2 }],
        'month',
      )

      expect(result[0]).toMatchObject({
        subsidyBTC: 0,
        feesBTC: 0.00000002,
        feePercent: 100,
        avgSatsPerVByte: 0,
      })
    })
  })

  describe('summarizeSubsidyFees', () => {
    it('derives totals from aggregated rows when API summary is absent', () => {
      const aggregated = mapLogToPeriodData(log, 'day')
      const summary = summarizeSubsidyFees(aggregated)

      expect(summary.totalSubsidyBTC).toBe(5.875)
      expect(summary.totalFeesBTC).toBe(0.375)
      expect(summary.totalRewardBTC).toBe(6.25)
      expect(summary.averageFeePercent).toBe(6)
      expect(summary.averageFeesSatsPerVByte).toBeCloseTo(0.285)
    })

    it('prefers API totals for reward and fee totals', () => {
      const totals: SubsidyFeesTotals = {
        totalBlockReward: 1_000_000_000,
        totalBlockTotalFees: 100_000_000,
        avgBlockReward: null,
        avgBlockTotalFees: null,
      }

      const summary = summarizeSubsidyFees(mapLogToPeriodData(log, 'day'), totals)

      expect(summary.totalSubsidyBTC).toBe(9)
      expect(summary.totalFeesBTC).toBe(1)
      expect(summary.averageFeePercent).toBe(10)
    })
  })

  describe('chart transforms', () => {
    it('builds the stacked subsidy / fees chart input with fee percent line', () => {
      const chart = transformToSubsidyFeesChartData(mapLogToPeriodData(log, 'day'))

      expect(chart.labels).toEqual(['Sat', 'Sun'])
      expect(chart.series).toHaveLength(2)
      expect(chart.series[0]).toMatchObject({ label: 'Subsidy', values: [3, 2.875] })
      expect(chart.series[1]).toMatchObject({ label: 'Fees', values: [0.125, 0.25] })
      expect(chart.lines?.[0]).toMatchObject({
        label: 'Fee %',
        values: [0.04, 0.08],
        yAxisID: 'y1',
      })
    })

    it('builds the average fees chart input', () => {
      const chart = transformToAverageFeesChartData(mapLogToPeriodData(log, 'day'))

      expect(chart.labels).toEqual(['Sat', 'Sun'])
      expect(chart.series).toEqual([
        expect.objectContaining({
          label: 'Average Fees in Sats/vByte',
          values: [0.27, 0.3],
        }),
      ])
    })
  })
})
