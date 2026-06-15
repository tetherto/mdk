import { describe, expect, it } from 'vitest'

import { mhsToPhs } from '@/components/domain/reporting-tool/multi-site/mining-report/lib'

import type { ReportApiResponse } from '../../mining-report.types'

import {
  buildAllSitesCharts,
  buildAllSitesChartsForReport,
  getAllSitesViewConfig,
} from './AllSites.util'

const TS_DAY_1 = 1640995200000
const TS_DAY_2 = 1641081600000

const emptyAllSitesCharts = {
  allSitesMetrics: {},
  siteMetrics: {},
  revenueChart: { labels: [], series: [] },
  hashrateChart: { series: [], constants: [] },
  downtimeChart: { labels: [], series: [] },
  productionCostChart: null,
}

const dailyLog = (
  ts: number,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  ts,
  period: 'daily',
  totalRevenueBTC: 0,
  totalEnergyCostsUSD: 0,
  totalOperationalCostsUSD: 0,
  hashrateMHS: 0,
  sitePowerW: 0,
  downtimeRate: 0,
  curtailmentRate: 0,
  currentBTCPrice: 0,
  ...overrides,
})

describe('AllSites.util', () => {
  describe('getAllSitesViewConfig', () => {
    it('uses daily downtime title for weekly reports', () => {
      expect(getAllSitesViewConfig('weekly').downtime.title).toBe('Daily Avg Downtime Rate')
      expect(getAllSitesViewConfig('weekly').revenue.barWidth).toBe(180)
    })

    it('uses monthly downtime title for monthly and yearly reports', () => {
      expect(getAllSitesViewConfig('monthly').downtime.title).toBe('Monthly Avg Downtime Rate')
      expect(getAllSitesViewConfig('yearly').isYearlyLayout).toBe(true)
    })
  })

  describe('buildAllSitesChartsForReport', () => {
    it('parses dateRange and returns charts plus view config', () => {
      const api = {
        data: { log: [dailyLog(TS_DAY_1, { totalRevenueBTC: 1 })] },
        regions: [{ region: 'SITE-C', log: [dailyLog(TS_DAY_1, { totalRevenueBTC: 1 })] }],
        period: 'daily',
      } as unknown as ReportApiResponse

      const { chartsData, viewConfig } = buildAllSitesChartsForReport(
        api,
        'weekly',
        'Jan 01, 2022 - Jan 07, 2022',
      )

      expect(viewConfig.revenue.title).toBe('Revenues Per Day')
      expect(chartsData.revenueChart.labels.length).toBeGreaterThan(0)
    })
  })

  describe('buildAllSitesCharts', () => {
    it('returns empty structure when API fails validation', () => {
      expect(buildAllSitesCharts({ data: { log: [] } } as unknown as ReportApiResponse)).toEqual(
        emptyAllSitesCharts,
      )
    })

    it('returns empty structure when no logs available', () => {
      const api = {
        data: { log: [] },
        regions: [],
        period: 'daily',
      } as unknown as ReportApiResponse

      expect(buildAllSitesCharts(api)).toEqual(emptyAllSitesCharts)
    })

    it('processes valid data for weekly report', () => {
      const api = {
        data: {
          log: [
            dailyLog(TS_DAY_1, {
              totalRevenueBTC: 0.5,
              revenueUSD: 25000,
              hashrateMHS: 5e13,
              sitePowerW: 1e8,
              downtimeRate: 0.05,
              currentBTCPrice: 50000,
            }),
            dailyLog(TS_DAY_2, {
              totalRevenueBTC: 0.3,
              revenueUSD: 15000,
              hashrateMHS: 3e13,
              sitePowerW: 6e7,
              downtimeRate: 0.03,
              currentBTCPrice: 50000,
            }),
          ],
          summary: {
            sum: { totalRevenueBTC: 0.8 },
            avg: {
              hashrateMHS: 4e13,
              sitePowerW: 8e7,
              downtimeRate: 0.04,
              currentBTCPrice: 50000,
              totalEnergyCostsUSD: 1000,
              efficiencyWThs: 30,
              energyRevenueUSD_MW: 500,
            },
          },
        },
        regions: [
          {
            region: 'SITE-C',
            log: [
              dailyLog(TS_DAY_1, { totalRevenueBTC: 0.3, hashrateMHS: 2e13 }),
              dailyLog(TS_DAY_2, { totalRevenueBTC: 0.2, hashrateMHS: 2e13 }),
            ],
            summary: {
              sum: { totalRevenueBTC: 0.5 },
              avg: {
                hashrateMHS: 2e13,
                sitePowerW: 5e7,
                downtimeRate: 0.03,
                currentBTCPrice: 50000,
                totalEnergyCostsUSD: 500,
                efficiencyWThs: 30,
                energyRevenueUSD_MW: 250,
              },
            },
          },
          {
            region: 'SITE-D',
            log: [
              dailyLog(TS_DAY_1, { totalRevenueBTC: 0.2, hashrateMHS: 2e13 }),
              dailyLog(TS_DAY_2, { totalRevenueBTC: 0.1, hashrateMHS: 2e13 }),
            ],
            summary: {
              sum: { totalRevenueBTC: 0.3 },
              avg: {
                hashrateMHS: 2e13,
                sitePowerW: 3e7,
                downtimeRate: 0.05,
                currentBTCPrice: 50000,
                totalEnergyCostsUSD: 500,
                efficiencyWThs: 30,
                energyRevenueUSD_MW: 250,
              },
            },
          },
        ],
        period: 'daily',
      } as unknown as ReportApiResponse

      const result = buildAllSitesCharts(api, { reportType: 'weekly' })

      expect(result.revenueChart.labels).toHaveLength(2)
      expect(result.revenueChart.series).toHaveLength(2)
      expect(result.revenueChart.series[0]?.label).toBe('SITE-C')
      expect(result.revenueChart.series[0]?.values).toEqual([0.3, 0.2])
      expect(result.revenueChart.series[1]?.values).toEqual([0.2, 0.1])

      expect((result.allSitesMetrics as { btcMined: { value: number } }).btcMined.value).toBe(0.8)
      expect(
        (result.siteMetrics as Record<string, { btcMined: { value: number } }>)['SITE-C'].btcMined
          .value,
      ).toBe(0.5)

      const siteCHashrate = result.hashrateChart.series.find((s) => s.label === 'SITE-C')
      expect(siteCHashrate?.points[0]?.value).toBe(mhsToPhs(2e13))

      expect(result.downtimeChart.labels).toHaveLength(2)
      expect(result.downtimeChart.series.length).toBeGreaterThan(0)
      expect(result.productionCostChart).toBeNull()
    })

    it('creates production cost chart for yearly report', () => {
      const api = {
        data: {
          log: [
            dailyLog(TS_DAY_1, {
              totalRevenueBTC: 1,
              currentBTCPrice: 50000,
              totalEnergyCostsUSD: 10_000,
              totalOperationalCostsUSD: 5_000,
            }),
          ],
        },
        regions: [
          {
            region: 'SITE-C',
            log: [
              dailyLog(TS_DAY_1, {
                totalRevenueBTC: 1,
                currentBTCPrice: 50000,
                totalEnergyCostsUSD: 10_000,
                totalOperationalCostsUSD: 5_000,
              }),
            ],
          },
        ],
        period: 'daily',
      } as unknown as ReportApiResponse

      const result = buildAllSitesCharts(api, { reportType: 'yearly' })

      expect(result.productionCostChart).not.toBeNull()
      expect(result.productionCostChart?.series).toHaveLength(2)
      expect(result.productionCostChart?.series[0]?.label).toBe('Bitcoin Price')
      expect(result.productionCostChart?.series[0]?.values[0]).toBe(50)
      expect(result.productionCostChart?.series[1]?.label).toBe('SITE-C')
      expect(result.productionCostChart?.series[1]?.values[0]).toBe(15)
    })

    it('handles invalid numeric values gracefully', () => {
      const api = {
        data: {
          log: [
            dailyLog(TS_DAY_1, {
              totalRevenueBTC: null,
              revenueUSD: 'invalid',
              hashrateMHS: Number.NaN,
              sitePowerW: null,
              downtimeRate: 'high',
            }),
          ],
          summary: {
            sum: { totalRevenueBTC: 0 },
            avg: {
              hashrateMHS: 0,
              sitePowerW: 0,
              downtimeRate: 0,
              currentBTCPrice: 0,
              totalEnergyCostsUSD: 0,
              efficiencyWThs: 0,
              energyRevenueUSD_MW: 0,
            },
          },
        },
        regions: [
          {
            region: 'SITE-C',
            log: [dailyLog(TS_DAY_1, { totalRevenueBTC: null })],
            summary: {
              sum: { totalRevenueBTC: 0 },
              avg: {
                hashrateMHS: 0,
                sitePowerW: 0,
                downtimeRate: 0,
                currentBTCPrice: 0,
                totalEnergyCostsUSD: 0,
                efficiencyWThs: 0,
                energyRevenueUSD_MW: 0,
              },
            },
          },
        ],
        period: 'daily',
      } as unknown as ReportApiResponse

      const result = buildAllSitesCharts(api)

      expect((result.allSitesMetrics as { btcMined: { value: number } }).btcMined.value).toBe(0)
      expect((result.allSitesMetrics as { avgHashrate: { value: number } }).avgHashrate.value).toBe(
        0,
      )
      expect(result.revenueChart.series[0]?.values[0]).toBe(0)
    })

    it('splits revenue correctly between sites', () => {
      const api = {
        data: {
          log: [dailyLog(TS_DAY_1, { totalRevenueBTC: 1 })],
        },
        regions: [
          {
            region: 'SITE-C',
            log: [dailyLog(TS_DAY_1, { totalRevenueBTC: 0.6 })],
          },
          {
            region: 'SITE-D',
            log: [dailyLog(TS_DAY_1, { totalRevenueBTC: 0.4 })],
          },
        ],
        period: 'daily',
      } as unknown as ReportApiResponse

      const result = buildAllSitesCharts(api)

      expect(result.revenueChart.series).toHaveLength(2)
      expect(result.revenueChart.series[0]?.label).toBe('SITE-C')
      expect(result.revenueChart.series[1]?.label).toBe('SITE-D')
      expect(result.revenueChart.series[0]?.values[0]).toBe(0.6)
      expect(result.revenueChart.series[1]?.values[0]).toBe(0.4)
    })
  })
})
