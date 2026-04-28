import type { MinMaxAvg, TimeRangeType } from '@tetherto/mdk-core-ui'
import { CHART_COLORS, decimalToMegaNumber, getTimeRange } from '@tetherto/mdk-core-ui'
import type { DateRangeKey } from '../../../../../constants'
import { DATE_RANGE, WEBAPP_DISPLAY_NAME } from '../../../../../constants'
import { getHashrateString } from '../../../../../utils/device-utils'
import type { HashRateDataPoint, HashRateLogEntry } from '../hash-rate-line-chart-utils'
import type { Timeline } from './hash-rate-line-chart-with-pool-constants'
import {
  SITE_OPERATION_CHART_COLORS,
  TIMELINE_INTERVAL_MS,
  TIMELINE_TO_THRESHOLD_KEY,
} from './hash-rate-line-chart-with-pool-constants'

type HashRateTimeRange = {
  start: number | undefined
  end: number | undefined
}

export type PoolStat = {
  poolType: string
  hashrate: number
}

export type MinerPoolDataItem = {
  stats: PoolStat[]
  ts: number | string
}

export type Legend = {
  label: string
  color: string
  poolType?: string
}

export type Dataset = {
  label: string
  color: string
  borderColor: string
  poolType?: string
  data: HashRateDataPoint[]
  visible?: boolean
}

type BuildChartDataProps = {
  legends: Legend[]
  timeRange: TimeRangeType
  aggrPoolData: HashRateDataPoint[]
  hashRateData: HashRateDataPoint[]
  legendHidden: Record<string, boolean>
  minerPoolData: MinerPoolDataItem[] | undefined
}

export type ChartDataResult = {
  datasets: Dataset[]
  timeRange?: TimeRangeType
  [key: string]: unknown
}

const aggregatePoolStats = (items: MinerPoolDataItem[]): PoolStat[] => {
  if (items.length === 0) return []

  const poolHashrates: Record<string, number[]> = {}

  for (const item of items) {
    for (const stat of item.stats) {
      if (!poolHashrates[stat.poolType]) {
        poolHashrates[stat.poolType] = []
      }
      poolHashrates[stat.poolType]?.push(stat.hashrate ?? 0)
    }
  }

  return Object.entries(poolHashrates).map(([poolType, hashrates]) => ({
    poolType,
    hashrate: hashrates.reduce((sum, h) => sum + h, 0) / (hashrates.length || 1),
  }))
}

export const downsampleToTimeline = (
  data: MinerPoolDataItem[],
  timeline: Timeline,
): MinerPoolDataItem[] => {
  if (!data || data.length === 0) return []

  const intervalMs = TIMELINE_INTERVAL_MS[timeline]

  if (timeline === DATE_RANGE.M5) {
    const seen = new Set<number>()
    return data
      .filter((item) => {
        const ts = Number(item.ts)
        if (seen.has(ts)) return false
        seen.add(ts)
        return true
      })
      .sort((a, b) => Number(a.ts) - Number(b.ts))
  }

  const buckets = data.reduce<Record<number, MinerPoolDataItem[]>>((acc, item) => {
    const ts = Number(item.ts)
    const bucketKey = Math.floor(ts / intervalMs) * intervalMs
    if (!acc[bucketKey]) acc[bucketKey] = []
    acc[bucketKey].push(item)
    return acc
  }, {})

  return Object.entries(buckets)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([bucketTs, items]) => ({
      ts: Number(bucketTs),
      stats: aggregatePoolStats(items),
    }))
}

export const getMajorDatasetItems = (
  majorData: MinerPoolDataItem[] | undefined,
  legend: Legend,
): HashRateDataPoint[] =>
  (majorData ?? []).map((dataset) => ({
    ...dataset,
    x: Number(dataset.ts),
    y: decimalToMegaNumber(
      dataset.stats.find((s) => s.poolType === legend.poolType)?.hashrate ?? 0,
    ),
  }))

export const normalizeDatasets = (
  datasets: Array<Omit<Dataset, 'borderColor' | 'data'> & { data?: HashRateDataPoint[] }>,
  legendHidden: Record<string, boolean>,
): Dataset[] =>
  datasets.map((dataset) => {
    const seen = new Set<number>()
    const processedData = (dataset.data ?? [])
      .filter((d) => {
        if (seen.has(d.x)) return false
        seen.add(d.x)
        return true
      })
      .sort((a, b) => a.x - b.x)

    return {
      ...dataset,
      data: processedData,
      borderColor: dataset.color ?? CHART_COLORS.SKY_BLUE,
      visible: !legendHidden[dataset.label],
    }
  })

export const getThresholdKey = (timeline: Timeline): DateRangeKey =>
  TIMELINE_TO_THRESHOLD_KEY[timeline] ?? DATE_RANGE.M5

export const getHashRateTimeRange = (
  data: HashRateLogEntry[] | HashRateLogEntry[][],
): HashRateTimeRange | null => {
  const firstItem = data[0] as HashRateLogEntry

  const flatData = (Array.isArray(firstItem) ? firstItem : data) as HashRateLogEntry[]

  if (flatData.length === 0) return null

  const timestamps = flatData.map(({ ts }) => ts ?? 0).filter((ts) => ts > 0)

  if (timestamps.length === 0) return null

  return {
    start: Math.min(...timestamps),
    end: Math.max(...timestamps),
  }
}

export const filterAndDownsampleMinerPoolData = (
  minerPoolData: MinerPoolDataItem[] | undefined,
  hashRateTimeRange: HashRateTimeRange | null,
  timeline: Timeline,
): MinerPoolDataItem[] | undefined => {
  if (!minerPoolData) return undefined

  const filteredData = minerPoolData.filter(({ ts }) => {
    const itemTs = Number(ts)
    if (hashRateTimeRange?.start && hashRateTimeRange?.end) {
      return itemTs >= hashRateTimeRange.start && itemTs <= hashRateTimeRange.end
    }
    return true
  })

  return downsampleToTimeline(filteredData, timeline)
}

export const transformHashRateData = (
  data: HashRateLogEntry[] | HashRateLogEntry[][],
): HashRateDataPoint[] => {
  const firstItem = data[0] as HashRateLogEntry

  const flatData = (Array.isArray(firstItem) ? firstItem : data) as HashRateLogEntry[]

  return flatData.map(({ ts = 0, hashrate_mhs_1m_sum_aggr = 0 }) => ({
    x: ts,
    y: hashrate_mhs_1m_sum_aggr,
  }))
}

export const calculateAggrPoolData = (
  minerPoolData: MinerPoolDataItem[] | undefined,
): HashRateDataPoint[] => {
  if (!minerPoolData) return []

  return minerPoolData.map(({ stats, ts }) => ({
    x: Number(ts),
    y: decimalToMegaNumber(stats.reduce((sum, { hashrate }) => sum + (hashrate ?? 0), 0)),
  }))
}

export const calculateMinMaxAvg = (hashRateData: HashRateDataPoint[]): MinMaxAvg => {
  if (hashRateData.length === 0) return {}

  let totalHashrate = 0
  let minHashrate = Number.MAX_SAFE_INTEGER
  let maxHashrate = Number.MIN_SAFE_INTEGER

  for (const { y } of hashRateData) {
    const hashrate = y ?? 0
    totalHashrate += hashrate
    if (hashrate < minHashrate) minHashrate = hashrate
    if (hashrate > maxHashrate) maxHashrate = hashrate
  }

  return {
    min: getHashrateString(minHashrate === Number.MAX_SAFE_INTEGER ? 0 : minHashrate),
    max: getHashrateString(maxHashrate === Number.MIN_SAFE_INTEGER ? 0 : maxHashrate),
    avg: getHashrateString(totalHashrate / (hashRateData.length || 1)),
  }
}

export const calculateTimeRange = (hashRateData: HashRateDataPoint[]): TimeRangeType =>
  getTimeRange(hashRateData.at(-1)?.x ?? 0, hashRateData[0]?.x ?? 0)

export const extractUniquePoolTypes = (
  minerPoolData: MinerPoolDataItem[] | undefined,
): string[] => {
  if (!minerPoolData || minerPoolData.length === 0) return []

  const seen = new Set<string>()

  for (const item of minerPoolData) {
    for (const stat of item.stats) {
      if (stat.poolType) seen.add(stat.poolType)
    }
  }

  return Array.from(seen)
}

export const buildLegends = (uniquePoolTypes: string[], hasData: boolean): Legend[] => {
  if (!hasData) return []

  const defaultLegend: Legend = {
    label: `${WEBAPP_DISPLAY_NAME} Hash Rate`,
    color: CHART_COLORS.SKY_BLUE,
  }

  if (uniquePoolTypes.length === 0) return [defaultLegend]

  const aggrPoolLegend: Legend = {
    label: 'Aggr Pool Hash Rate',
    color: CHART_COLORS.METALLIC_BLUE,
  }

  const mappedLegends: Legend[] = uniquePoolTypes.map((poolType, index) => ({
    poolType,
    label: `${poolType.charAt(0).toUpperCase() + poolType.slice(1)} Hash Rate`,
    color: SITE_OPERATION_CHART_COLORS[index + 1] ?? CHART_COLORS.purple,
  }))

  return [defaultLegend, aggrPoolLegend, ...mappedLegends]
}

export const buildChartData = ({
  legends,
  hashRateData,
  aggrPoolData,
  minerPoolData,
  legendHidden,
  timeRange,
}: BuildChartDataProps): ChartDataResult => {
  const datasets = legends.map((legend, index) => {
    const data =
      index === 0
        ? hashRateData
        : index === 1
          ? aggrPoolData
          : getMajorDatasetItems(minerPoolData, legend)

    return { ...legend, data }
  })

  return {
    datasets: normalizeDatasets(datasets, legendHidden),
    timeRange,
  }
}
