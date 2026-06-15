import _groupBy from 'lodash/groupBy'
import _keys from 'lodash/keys'
import _map from 'lodash/map'
import _meanBy from 'lodash/meanBy'
import _sortBy from 'lodash/sortBy'
import _takeRight from 'lodash/takeRight'

import { CHART_COLORS, CURRENCY, UNITS } from '@core'
import {
  buildBarChart,
  buildLineChart,
  fillMissingPeriodsInAggregated,
  getLabelFormat,
  getPeriod,
  makeLabelFormatter,
  mhsToPhs,
  safeNum,
  validateApiData,
} from '@/components/domain/reporting-tool/multi-site/mining-report/lib'
import { formatDataLabel } from '@/components/domain/reporting-tool/multi-site/mining-report/lib/chart-builders'
import type {
  AggregatedDataItem,
  LogEntry,
  MetricCardData,
  RegionData,
  ReportApiResponse,
  ReportType,
} from '@/components/domain/reporting-tool/multi-site/mining-report/mining-report.types'
import { TIMEFRAME_TYPE } from '@/constants/ranges'

import { ALL_SITES_METRICS_TEMPLATE } from './all-sites-metrics.constants'
import { parseDateRange } from '../../mining-report.util'

type ProcessAllSitesDataParams = {
  buckets: number
  period: string
  allLogs: LogEntry[]
  labelFormatter: (ts: number) => string
} & Partial<{
  endDate: string | Date | number
  startDate: string | Date | number
}>

const getBucketsByReportType = (reportType: string) => {
  switch (reportType) {
    case 'yearly':
      return 12
    case 'monthly':
      return 16
    default:
      return 6
  }
}

const getEmptyAllSitesData = () => {
  return {
    allSitesMetrics: {},
    siteMetrics: {},
    revenueChart: { labels: [], series: [] },
    hashrateChart: { series: [], constants: [] },
    downtimeChart: { labels: [], series: [] },
    productionCostChart: null,
  }
}

const processAllSitesData = ({
  allLogs,
  labelFormatter,
  buckets,
  startDate,
  endDate,
  period,
}: ProcessAllSitesDataParams) => {
  const sortedLogs = _sortBy(allLogs, 'ts')
  const recentLogs = _takeRight(sortedLogs, buckets)

  const byTimestamp = _groupBy(recentLogs, (log) => labelFormatter(log.ts))

  // Build aggregated data for chart labels and BTC price (used in production cost chart)
  const aggregated: AggregatedDataItem[] = _map(_keys(byTimestamp), (label) => {
    const logsForTimestamp = byTimestamp[label]

    return {
      label,
      ts: logsForTimestamp?.[0]?.ts ?? 0,
      currentBTCPrice: _meanBy(logsForTimestamp, (log) => safeNum(log.currentBTCPrice)),
    }
  })

  const sortedAggregated = _sortBy(aggregated, 'ts')

  // Fill missing periods if date range is provided
  let finalAggregated = sortedAggregated
  if (startDate && endDate) {
    const labelFormat = getLabelFormat(period)
    finalAggregated = fillMissingPeriodsInAggregated(
      sortedAggregated,
      startDate,
      endDate,
      period,
      labelFormat,
    )
  }

  return {
    aggregated: finalAggregated,
  }
}

const buildAllSitesMetrics = (api: ReportApiResponse): Record<string, MetricCardData> => {
  const summary = api?.data?.summary
  if (!summary) return {}

  const { sum, avg: avgSummary } = summary

  return {
    btcMined: { ...ALL_SITES_METRICS_TEMPLATE.btcMined, value: safeNum(sum.totalRevenueBTC) },
    avgEnergyCost: {
      ...ALL_SITES_METRICS_TEMPLATE.avgEnergyCost,
      value: safeNum(avgSummary.totalEnergyCostsUSD),
    },
    avgBtcCost: { ...ALL_SITES_METRICS_TEMPLATE.avgBtcCost, value: safeNum(avgSummary.currentBTCPrice) },
    avgHashrate: { ...ALL_SITES_METRICS_TEMPLATE.avgHashrate, value: safeNum(avgSummary.hashrateMHS) },
    avgEfficiency: { ...ALL_SITES_METRICS_TEMPLATE.avgEfficiency, value: safeNum(avgSummary.efficiencyWThs) },
    avgEnergyRevenue: {
      ...ALL_SITES_METRICS_TEMPLATE.avgEnergyRevenue,
      value: safeNum(avgSummary.energyRevenueUSD_MW),
    },
    avgDowntime: { ...ALL_SITES_METRICS_TEMPLATE.avgDowntime, value: safeNum(avgSummary.downtimeRate) * 100 },
    avgPowerConsumption: {
      ...ALL_SITES_METRICS_TEMPLATE.avgPowerConsumption,
      value: safeNum(avgSummary.sitePowerW),
    },
  }
}

const buildSiteMetrics = (
  regions: RegionData[],
): Record<string, Record<string, MetricCardData>> => {
  const siteMetrics: Record<string, Record<string, MetricCardData>> = {}

  _map(regions, (region) => {
    const regionKey = region.region || 'Unknown'
    const summary = region.summary

    if (summary) {
      const { sum, avg: avgSummary } = summary
      siteMetrics[regionKey] = {
        btcMined: { ...ALL_SITES_METRICS_TEMPLATE.btcMined, value: safeNum(sum.totalRevenueBTC) },
        avgEnergyCost: {
          ...ALL_SITES_METRICS_TEMPLATE.avgEnergyCost,
          value: safeNum(avgSummary.totalEnergyCostsUSD),
        },
        avgBtcCost: { ...ALL_SITES_METRICS_TEMPLATE.avgBtcCost, value: safeNum(avgSummary.currentBTCPrice) },
        avgHashrate: { ...ALL_SITES_METRICS_TEMPLATE.avgHashrate, value: safeNum(avgSummary.hashrateMHS) },
        avgEfficiency: {
          ...ALL_SITES_METRICS_TEMPLATE.avgEfficiency,
          value: safeNum(avgSummary.efficiencyWThs),
        },
        avgEnergyRevenue: {
          ...ALL_SITES_METRICS_TEMPLATE.avgEnergyRevenue,
          value: safeNum(avgSummary.energyRevenueUSD_MW),
        },
        avgDowntime: {
          ...ALL_SITES_METRICS_TEMPLATE.avgDowntime,
          value: safeNum(avgSummary.downtimeRate) * 100,
        },
        avgPowerConsumption: {
          ...ALL_SITES_METRICS_TEMPLATE.avgPowerConsumption,
          value: safeNum(avgSummary.sitePowerW),
        },
      }
    }
  })

  return siteMetrics
}

const buildRevenueChart = (aggregatedData: AggregatedDataItem[], regions: RegionData[]) => {
  if (!aggregatedData?.length || !regions?.length) {
    return { labels: [], series: [] }
  }

  const labels = _map(aggregatedData, 'label')
  const colors = [CHART_COLORS.blue, CHART_COLORS.red, CHART_COLORS.green, CHART_COLORS.orange]

  // Build actual per-region revenue data from each region's logs
  const series = _map(regions, (region, index) => {
    const regionName = region.region || 'Unknown'
    const regionLogs = region.log || []

    // Create a map of label -> revenue for this region
    const labelFormatter = makeLabelFormatter(region.log?.[0]?.period || 'monthly')
    const revenueByLabel: Record<string, number> = {}

    _map(regionLogs, (log) => {
      const label = labelFormatter(log.ts)
      revenueByLabel[label] = safeNum(log.totalRevenueBTC)
    })

    // Map to the aggregated labels to ensure alignment
    const values = _map(labels, (label) => revenueByLabel[label] || 0)

    return {
      label: regionName,
      values,
      color: colors[index % colors.length],
      options: { stack: 'rev' },
    }
  })

  return buildBarChart(labels, series)
}

const buildHashrateChart = (aggregatedData: AggregatedDataItem[], regions: RegionData[]) => {
  if (!aggregatedData?.length || !regions?.length) {
    return { series: [], constants: [] }
  }

  const colors = [CHART_COLORS.blue, CHART_COLORS.red, CHART_COLORS.green, CHART_COLORS.orange]

  // Build actual per-region hashrate data from each region's logs
  const series = _map(regions, (region, index) => {
    const regionName = region.region || 'Unknown'
    const regionLogs = region.log || []

    // Build time-series data for this region
    const data = _map(regionLogs, (log) => ({
      ts: safeNum(log.ts),
      value: mhsToPhs(safeNum(log.hashrateMHS)),
    }))

    return {
      label: regionName,
      data,
      color: colors[index % colors.length],
    }
  })

  // Add nominal hashrate as reference line
  const totalNominalHashratePHs = _map(regions, (r) => safeNum(r.nominalHashrate) / 1e15).reduce(
    (sum, val) => sum + val,
    0,
  )

  const constants =
    totalNominalHashratePHs > 0
      ? [
          {
            label: 'Nominal',
            value: totalNominalHashratePHs,
            color: CHART_COLORS.orange,
          },
        ]
      : []

  return buildLineChart(series, constants)
}

const buildDowntimeChart = (aggregatedData: AggregatedDataItem[], regions: RegionData[]) => {
  if (!aggregatedData?.length || !regions?.length) {
    return { labels: [], series: [] }
  }

  const labels = _map(aggregatedData, 'label')
  const colors = [
    { curtailment: CHART_COLORS.blue, opIssues: CHART_COLORS.green },
    { curtailment: CHART_COLORS.red, opIssues: CHART_COLORS.VIOLET },
    { curtailment: CHART_COLORS.orange, opIssues: CHART_COLORS.SKY_BLUE },
    { curtailment: CHART_COLORS.purple, opIssues: CHART_COLORS.yellow },
  ]

  const series: Array<{
    label: string
    values: number[]
    color: string
    options: { stack: string }
  }> = []
  _map(regions, (region, index) => {
    const regionName = region.region || 'Unknown'
    const colorSet = colors[index % colors.length] ?? {
      curtailment: CHART_COLORS.blue,
      opIssues: CHART_COLORS.green,
    }
    const regionLogs = region.log || []

    // Create a map of label -> downtime for this region
    const labelFormatter = makeLabelFormatter(region.log?.[0]?.period || 'monthly')
    const downtimeByLabel: Record<string, { curtailment: number; opIssues: number }> = {}

    _map(regionLogs, (log) => {
      const label = labelFormatter(log.ts)
      downtimeByLabel[label] = {
        curtailment: safeNum(log.curtailmentRate) || safeNum(log.downtimeRate) * 0.85,
        opIssues: safeNum(log.downtimeRate) * 0.15,
      }
    })

    // Map to the aggregated labels to ensure alignment
    const curtailmentValues = _map(labels, (label) => downtimeByLabel[label]?.curtailment || 0)
    const opIssuesValues = _map(labels, (label) => downtimeByLabel[label]?.opIssues || 0)

    series.push({
      label: `${regionName} - Curtailment`,
      values: curtailmentValues,
      color: colorSet.curtailment,
      options: { stack: regionName },
    })

    series.push({
      label: `${regionName} - Op. Issues`,
      values: opIssuesValues,
      color: colorSet.opIssues,
      options: { stack: regionName },
    })
  })

  return buildBarChart(labels, series)
}

const buildProductionCostChart = (aggregatedData: AggregatedDataItem[], regions: RegionData[]) => {
  if (!aggregatedData?.length || !regions?.length) {
    return { labels: [], series: [] }
  }

  const labels = _map(aggregatedData, 'label')
  const colors = [CHART_COLORS.blue, CHART_COLORS.red, CHART_COLORS.orange, CHART_COLORS.purple]

  const btcPriceValues = _map(aggregatedData, (d) => Number(d.currentBTCPrice) / 1000 || 0)

  const series: Array<{ label: string; values: number[]; color: string }> = [
    {
      label: 'Bitcoin Price',
      values: btcPriceValues,
      color: CHART_COLORS.green,
    },
  ]

  // Build actual per-region production cost data from each region's logs
  _map(regions, (region, index) => {
    const regionName = region.region || 'Unknown'
    const regionLogs = region.log || []

    // Create a map of label -> production cost for this region
    const labelFormatter = makeLabelFormatter(region.log?.[0]?.period || 'monthly')
    const costByLabel: Record<string, number> = {}

    _map(regionLogs, (log) => {
      const label = labelFormatter(log.ts)
      const totalCosts = safeNum(log.totalEnergyCostsUSD) + safeNum(log.totalOperationalCostsUSD)
      const btcMined = safeNum(log.totalRevenueBTC)
      costByLabel[label] = btcMined > 0 ? totalCosts / btcMined / 1000 : 0
    })

    // Map to the aggregated labels to ensure alignment
    const prodCosts = _map(labels, (label) => costByLabel[label] || 0)

    series.push({
      label: regionName,
      values: prodCosts,
      color: colors[index % colors.length] ?? CHART_COLORS.blue,
    })
  })

  return buildBarChart(labels, series)
}

export const buildAllSitesCharts = (
  api: ReportApiResponse,
  {
    reportType = 'weekly',
    startDate,
    endDate,
  }: {
    reportType?: string
    startDate?: string | Date | number
    endDate?: string | Date | number
  } = {},
) => {
  const apiValidation = validateApiData(api)

  if (!apiValidation.isValid) {
    return getEmptyAllSitesData()
  }

  const logs = api?.data?.log || []
  const period = api?.period || getPeriod(api)
  const regions = api?.regions || []

  if (!logs?.length) {
    return getEmptyAllSitesData()
  }

  const labelFormatter = makeLabelFormatter(period)

  const buckets = getBucketsByReportType(reportType)

  const processedData = processAllSitesData({
    allLogs: logs,
    labelFormatter,
    buckets,
    startDate,
    endDate,
    period,
  })

  // Use BE pre-aggregated summaries for metrics
  const allSitesMetrics = buildAllSitesMetrics(api)
  const siteMetrics = buildSiteMetrics(regions)

  const revenueChart = buildRevenueChart(processedData.aggregated, regions)
  const hashrateChart = buildHashrateChart(processedData.aggregated, regions)
  const downtimeChart = buildDowntimeChart(processedData.aggregated, regions)

  const productionCostChart =
    reportType === 'yearly' ? buildProductionCostChart(processedData.aggregated, regions) : null

  return {
    allSitesMetrics,
    siteMetrics,
    revenueChart,
    hashrateChart,
    downtimeChart,
    productionCostChart,
  }
}

export type AllSitesChartsData = ReturnType<typeof buildAllSitesCharts>

export type AllSitesViewConfig = {
  revenue: {
    title: string
    yFormatter: (value: number) => string
    unit: string
    barWidth: number
  }
  downtime: {
    title: string
    barWidth: number
  }
  hashrate: {
    title: string
    timeframeType?: string
    unit?: string
  }
  isYearlyLayout: boolean
}

export const getAllSitesViewConfig = (reportType: ReportType | string = 'weekly'): AllSitesViewConfig => {
  const isWeekly = reportType === 'weekly'
  const isYearly = reportType === 'yearly'

  return {
    revenue: {
      title: `Revenues Per ${isYearly ? 'Month' : 'Day'}`,
      yFormatter: (value: number) => `${formatDataLabel(value)} ${CURRENCY.BTC}`,
      unit: CURRENCY.BTC,
      barWidth: isWeekly ? 180 : 43,
    },
    downtime: {
      title: isWeekly ? 'Daily Avg Downtime Rate' : 'Monthly Avg Downtime Rate',
      barWidth: isWeekly ? 24 : 28,
    },
    hashrate: {
      title: 'Hashrate',
      ...(isYearly ? { timeframeType: TIMEFRAME_TYPE.YEAR } : {}),
      ...(isWeekly ? { unit: UNITS.ENERGY_MW } : {}),
    },
    isYearlyLayout: isYearly,
  }
}

export const buildAllSitesChartsForReport = (
  api: ReportApiResponse,
  reportType: ReportType | string,
  dateRange: string,
): { chartsData: AllSitesChartsData; viewConfig: AllSitesViewConfig } => {
  const { startDate, endDate } = parseDateRange(dateRange)
  return {
    chartsData: buildAllSitesCharts(api, { reportType, startDate, endDate }),
    viewConfig: getAllSitesViewConfig(reportType),
  }
}
