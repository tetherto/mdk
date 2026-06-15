import type {
  DailyLogEntry,
  LogEntry,
  MonthlyLogEntry,
  RegionData,
  ReportApiResponse,
  ReportPeriod,
  SummaryEntry,
} from '@tetherto/mdk-react-devkit/foundation'
import { eachDayOfInterval } from 'date-fns/eachDayOfInterval'
import { eachMonthOfInterval } from 'date-fns/eachMonthOfInterval'
import { parseISO } from 'date-fns/parseISO'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import _toUpper from 'lodash/toUpper'

const DEFAULT_REGIONS = ['UY', 'PY']

const createSummaryEntry = (logs: LogEntry[]): SummaryEntry => {
  const count = logs.length || 1
  const sum = logs.reduce(
    (acc, row) => ({
      totalRevenueBTC: acc.totalRevenueBTC + row.totalRevenueBTC,
      totalCostsUSD: acc.totalCostsUSD + row.totalCostsUSD,
      totalEnergyCostsUSD: acc.totalEnergyCostsUSD + row.totalEnergyCostsUSD,
      totalOperationalCostsUSD: acc.totalOperationalCostsUSD + row.totalOperationalCostsUSD,
      revenueUSD: (acc.revenueUSD ?? 0) + (row.revenueUSD ?? 0),
      totalFeesBTC: acc.totalFeesBTC + row.totalFeesBTC,
      ebitdaNotSellingBTC: acc.ebitdaNotSellingBTC + row.ebitdaNotSellingBTC,
    }),
    {
      totalRevenueBTC: 0,
      totalCostsUSD: 0,
      totalEnergyCostsUSD: 0,
      totalOperationalCostsUSD: 0,
      revenueUSD: 0,
      totalFeesBTC: 0,
      ebitdaNotSellingBTC: 0,
    },
  )

  const avg = logs.reduce(
    (acc, row) => ({
      hashrateMHS: acc.hashrateMHS + row.hashrateMHS,
      sitePowerW: acc.sitePowerW + row.sitePowerW,
      downtimeRate: acc.downtimeRate + row.downtimeRate,
      curtailmentRate: acc.curtailmentRate + row.curtailmentRate,
      efficiencyWThs: acc.efficiencyWThs + row.efficiencyWThs,
      currentBTCPrice: acc.currentBTCPrice + row.currentBTCPrice,
      energyRevenueUSD_MW: acc.energyRevenueUSD_MW + (row.energyRevenueUSD_MW ?? 0),
      hashRevenueUSD_PHS_d: acc.hashRevenueUSD_PHS_d + (row.hashRevenueUSD_PHS_d ?? 0),
      hashCostUSD_PHS_d: acc.hashCostUSD_PHS_d + (row.hashCostUSD_PHS_d ?? 0),
    }),
    {
      hashrateMHS: 0,
      sitePowerW: 0,
      downtimeRate: 0,
      curtailmentRate: 0,
      efficiencyWThs: 0,
      currentBTCPrice: 0,
      energyRevenueUSD_MW: 0,
      hashRevenueUSD_PHS_d: 0,
      hashCostUSD_PHS_d: 0,
    },
  )

  return {
    ...sum,
    ...Object.fromEntries(
      _map(avg, (value, key) => [key, value / count])
    ),
    ebitdaSellingBTC: sum.totalRevenueBTC * 0.12,
    totalFeesUSD: sum.totalFeesBTC * (avg.currentBTCPrice / count),
    energyRevenueBTC_MW: 0.002,
    hashRevenueBTC_PHS_d: 0.00004,
    hashCostBTC_PHS_d: 0.00003,
    avgFeesSatsVByte: 18,
    operationalIssues: 0.02,
  } as SummaryEntry
}

const createDailyLogEntry = (date: Date, index: number, scale: number): DailyLogEntry => {
  const btcPrice = 93050
  const revenueBtc = 0.17 * scale * (1 + (index % 5) * 0.04)
  const hashrateMHS = 4.41e13 * scale * (0.92 + (index % 7) * 0.02)
  const powerW = 8.5e7 * scale
  const curtailmentRate = 0.04 + (index % 3) * 0.01
  const downtimeRate = curtailmentRate + 0.004

  return {
    ts: date.getTime(),
    period: 'daily',
    totalRevenueBTC: revenueBtc,
    totalFeesBTC: revenueBtc * 0.015,
    totalFeesUSD: revenueBtc * btcPrice * 0.015,
    revenueUSD: revenueBtc * btcPrice,
    totalCostsUSD: revenueBtc * btcPrice * 0.55,
    ebitdaSellingBTC: revenueBtc * 0.11,
    ebitdaNotSellingBTC: revenueBtc * 0.09,
    energyRevenueBTC_MW: 0.0018 * scale,
    energyRevenueUSD_MW: 840 * scale,
    hashRevenueBTC_PHS_d: 0.000038 * scale,
    hashRevenueUSD_PHS_d: 3.5 * scale,
    hashCostBTC_PHS_d: 0.000028 * scale,
    hashCostUSD_PHS_d: 2.6 * scale,
    hashrateMHS,
    sitePowerW: powerW,
    avgFeesSatsVByte: 16 + (index % 3),
    currentBTCPrice: btcPrice,
    efficiencyWThs: 28.13,
    totalEnergyCostsUSD: 38770.7 * scale,
    totalOperationalCostsUSD: revenueBtc * btcPrice * 0.12,
    curtailmentMWh: 120 * scale * (index % 3),
    curtailmentRate,
    operationalIssues: 0.01 + (index % 2) * 0.005,
    downtimeRate,
  }
}

const createMonthlyLogEntry = (date: Date, index: number, scale: number): MonthlyLogEntry => {
  const daily = createDailyLogEntry(date, index, scale)
  return {
    ...daily,
    period: 'monthly',
    month: date.getMonth() + 1,
    year: date.getFullYear(),
    monthName: date.toLocaleString('en-US', { month: 'long' }),
    totalRevenueBTC: daily.totalRevenueBTC * 28,
    revenueUSD: (daily.revenueUSD ?? 0) * 28,
    totalCostsUSD: daily.totalCostsUSD * 28,
  }
}

const buildLogsForRange = (
  startDate: string,
  endDate: string,
  period: ReportPeriod,
  scale: number,
): LogEntry[] => {
  const start = parseISO(startDate)
  const end = parseISO(endDate)

  if (period === 'monthly') {
    return _map(eachMonthOfInterval({ start, end }), (date, index) =>
      createMonthlyLogEntry(date, index, scale),
    )
  }

  return _map(eachDayOfInterval({ start, end }), (date, index) =>
    createDailyLogEntry(date, index, scale),
  )
}

const buildRegionData = (
  region: string,
  startDate: string,
  endDate: string,
  period: ReportPeriod,
  scale: number,
): RegionData => {
  const log = buildLogsForRange(startDate, endDate, period, scale)
  return {
    region,
    log,
    summary: {
      sum: createSummaryEntry(log),
      avg: createSummaryEntry(log),
    },
    nominalHashrate: 5e13 * scale,
    nominalEfficiency: 28,
    nominalMinerCapacity: 12000 * scale,
  }
}

export type BuildDemoMiningReportResponseOptions = {
  regions?: string[]
  startDate: string
  endDate: string
  period: ReportPeriod
}

/** Synthetic weekly/monthly report payload for the MDK demo app. */
export const buildDemoMiningReportResponse = ({
  regions,
  startDate,
  endDate,
  period,
}: BuildDemoMiningReportResponseOptions): ReportApiResponse => {
  const regionKeys = _isEmpty(regions) ? [...DEFAULT_REGIONS] : _map(regions, (r) => _toUpper(r))

  const regionData = _map(regionKeys, (region, index) =>
    buildRegionData(region, startDate, endDate, period, index === 0 ? 0.43 : 0.5),
  )

  const aggregatedLog = buildLogsForRange(startDate, endDate, period, 1)

  return {
    period,
    regions: regionData,
    data: {
      log: aggregatedLog,
      summary: {
        sum: createSummaryEntry(aggregatedLog),
        avg: createSummaryEntry(aggregatedLog),
      },
      nominalHashrate: 9.5e13,
      nominalMinerCapacity: 24000,
      nominalEfficiency: 28.13,
    },
  }
}
