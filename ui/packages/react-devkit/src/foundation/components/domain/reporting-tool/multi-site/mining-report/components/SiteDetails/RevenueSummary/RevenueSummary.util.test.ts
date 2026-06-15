import _filter from 'lodash/filter'
import _includes from 'lodash/includes'
import _map from 'lodash/map'
import { describe, expect, it, vi } from 'vitest'

import { buildRevenuesSummaryData } from './RevenueSummary.util'

import { PERIOD } from '@/constants/ranges'
import type { ReportApiResponse } from '../../../mining-report.types'

type LogEntry = {
  ts?: number
  period?: string
  totalRevenueBTC?: number | null
  totalEnergyCostsUSD?: number | null
  totalOperationalCostsUSD?: number | null
  hashrateMHS?: number | number[] | null
  downtimeRate?: number | null
}

type Region = {
  region: string
  log?: LogEntry[]
}

type MockApi = {
  regions?: Region[]
  period?: string
}

type ChartSeries = {
  label: string
  values: number[]
  color?: string
  stack?: string
  gradient?: { top: number; bottom: number }
  datalabels?: { display: boolean }
}

vi.mock('@/components/domain/reporting-tool/multi-site/mining-report/lib', () => ({
  validateApiData: (api: MockApi | null | undefined) => ({ isValid: !!api }),
  validateLogs: (logs?: LogEntry[]) => ({ isValid: !!logs && logs.length > 0 }),
  safeNum: (val?: number) => (typeof val === 'number' && !Number.isNaN(val) ? val : 0),
  avg: (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0),
  processAggregatedData: (
    byLabel: Record<string, object>,
    allLabels: string[],
    period?: string,
    startDate?: number,
    endDate?: number,
    fallbackLimit?: number,
  ) => {
    const data = allLabels.map((label) => ({ label, ...byLabel[label] }))
    return fallbackLimit ? data.slice(-fallbackLimit) : data
  },
  buildBarChart: (labels: string[], seriesData: ChartSeries[]) => ({
    labels,
    series: seriesData.map((s) => ({
      label: s.label,
      values: s.values,
      color: s.color,
      gradient: { top: 0.3, bottom: 0.1 },
      datalabels: { display: true },
    })),
  }),
  EMPTY_STRUCTURES: {
    revenueSummary: {
      revenuesChart: { labels: [], series: [] },
      operationsEnergyCostData: { operationsCost: 0, energyCost: 0 },
      bitcoinMetrics: [],
      energyHashMetrics: [],
    },
  },
  pickLogs: (api: MockApi, filter?: string[]) => {
    if (!api?.regions) return { logsPerSource: [], period: 'daily' }
    const regions = filter?.length
      ? _filter(api.regions, ({ region }) => _includes(filter, region))
      : api.regions
    return {
      logsPerSource: _map(regions, ({ log }) => log || []),
      period: api.period || regions[0]?.log?.[0]?.period || 'daily',
    }
  },
  makeLabelFormatter: (period?: string) =>
    period === PERIOD.MONTHLY
      ? (ts: number) => `${ts}-monthly-label`
      : (ts: number) => `${ts}-daily-label`,
}))

vi.mock('@/constants/colors', () => ({
  COLOR: {
    WHITE_ALPHA_01: '#FFFFFF1A',
    WHITE_ALPHA_07: '#ffffffb3',
    COLD_ORANGE: '#F7931A',
    WHITE: '#FFFFFF',
    MINT_GREEN: '#6EE7B7',
  },
  CHART_COLORS: {
    blue: '#1890FF',
    red: '#F5222D',
    green: '#72F59E',
    yellow: '#FFC107',
    orange: '#FF6A00',
  },
}))

describe('RevenueSummary.util', () => {
  describe('buildRevenuesSummaryData', () => {
    it('processes empty regions correctly', () => {
      const mockApi = { regions: [] } as unknown as ReportApiResponse
      const result = buildRevenuesSummaryData(mockApi, { regionFilter: ['SITE-C'], buckets: 12 })
      expect(result.revenuesChart.labels).toHaveLength(0)
      expect(result.revenuesChart.series[0].values).toEqual([])
      expect(result.operationsEnergyCostData).toMatchObject({ operationsCost: 0, energyCost: 0 })
      expect(result.bitcoinMetrics[0].value).toBe(0)
    })

    it('processes single log entry correctly', () => {
      const mockApi = {
        regions: [
          {
            region: 'SITE-C',
            log: [
              {
                ts: 1640995200000,
                totalRevenueBTC: 1.5,
                totalEnergyCostsUSD: 1000,
                totalOperationalCostsUSD: 500,
                hashrateMHS: 50000000,
                downtimeRate: 0.05,
              },
            ],
          },
        ],
      } as unknown as ReportApiResponse

      const result = buildRevenuesSummaryData(mockApi, { regionFilter: ['SITE-C'], buckets: 12 })
      expect(result.revenuesChart.labels).toHaveLength(1)
      expect(result.revenuesChart.series[0].values).toEqual([1.5])
      expect(result.operationsEnergyCostData).toMatchObject({
        operationsCost: 500,
        energyCost: 1000,
      })
      expect(result.bitcoinMetrics[0]).toMatchObject({ id: 'total_bitcoin', value: 1.5 })
      expect(result.energyHashMetrics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'avg_hashrate', unit: 'EH/s' }),
          expect.objectContaining({ id: 'avg_downtime_rate', unit: '%' }),
        ]),
      )
    })

    it('handles invalid numeric values gracefully', () => {
      const mockApi = {
        regions: [
          {
            region: 'SITE-C',
            log: [
              {
                ts: 1640995200000,
                totalRevenueBTC: null,
                totalEnergyCostsUSD: undefined,
                totalOperationalCostsUSD: 'invalid' as unknown as number,
                hashrateMHS: [45000000] as unknown as number,
                downtimeRate: Number.NaN,
              },
            ],
          },
        ],
      } as unknown as ReportApiResponse

      const result = buildRevenuesSummaryData(mockApi, { regionFilter: ['SITE-C'], buckets: 12 })
      expect(result.revenuesChart.series[0].values).toEqual([0])
      expect(result.operationsEnergyCostData).toMatchObject({ operationsCost: 0, energyCost: 0 })
      expect(result.bitcoinMetrics[0].value).toBe(0)
    })

    it('uses default parameters when not provided', () => {
      const mockApi = { regions: [] } as unknown as ReportApiResponse
      const result = buildRevenuesSummaryData(mockApi)
      expect(result.revenuesChart.labels).toHaveLength(0)
    })
  })
})
