import type { CompleteMinerTypeValue } from '../../../../../constants/device-constants'
import { COMPLETE_MINER_TYPES, MINER_TYPE_NAME_MAP } from '../../../../../constants/device-constants'
import type { MetricsConsumptionLogEntry } from '../../../../../types/metrics'
import { formatPowerConsumption } from '../../../../../utils/device-utils'
import { megawattsToWatts } from './energy-report-chart.constants'
import type { ContainerPowerModeTailLogKey, MinerModeKey } from './energy-report.constants'
import {
  CONTAINER_POWER_MODES_MAP,
  ENERGY_REPORT_TAIL_LOG_KEYS,
  MinerTypePowerModesMap,
} from './energy-report.constants'
import {
  readEnergyReportTailLogBucketMetric,
  readEnergyReportTailLogHead,
  readEnergyReportTailLogNumericBucket,
} from './energy-report-tail-log.utils'
import type {
  EnergyReportContainer,
  EnergyReportTailLogItem,
  PowerModeTableRow,
  SitePowerConsumptionSlice,
} from './energy-report.types'

export { readEnergyReportTailLogHead } from './energy-report-tail-log.utils'

export const mapConsumptionLogToChartPoints = (
  log: MetricsConsumptionLogEntry[] | undefined,
): Array<{ ts: number; consumption: number }> =>
  (log ?? []).map(({ ts, powerW }) => ({ ts, consumption: powerW }))

export const resolveNominalPowerW = (
  nominalMw: number | null | undefined,
  isLoading: boolean,
): number | null => {
  if (isLoading) return null
  if (nominalMw == null || Number.isNaN(nominalMw)) return 0
  return megawattsToWatts(nominalMw)
}

export const buildSitePowerConsumptionSlice = (input: {
  log?: MetricsConsumptionLogEntry[]
  nominalMw?: number | null
  nominalConfigLoading?: boolean
  consumptionLoading?: boolean
  consumptionFetching?: boolean
  consumptionError?: unknown
}): SitePowerConsumptionSlice => ({
  data: mapConsumptionLogToChartPoints(input.log),
  nominalValue: resolveNominalPowerW(input.nominalMw, !!input.nominalConfigLoading),
  isLoading: !!(input.consumptionLoading || input.consumptionFetching),
  error: input.consumptionError,
})

export const getMinersTypePowerModeChartData = (
  type: CompleteMinerTypeValue,
  tailLogItem: EnergyReportTailLogItem | null | undefined,
): Record<string, number> & { total?: number } => {
  if (!tailLogItem || Object.keys(tailLogItem).length === 0) {
    return {}
  }

  const data = Object.keys(MinerTypePowerModesMap).reduce<Record<string, number>>((accum, key) => {
    const modeKey = MinerTypePowerModesMap[key as MinerModeKey]
    const value = readEnergyReportTailLogBucketMetric(tailLogItem, key, type)
    return { ...accum, [String(modeKey)]: value }
  }, {})

  const total = Object.values(data).reduce((sum, n) => sum + n, 0)
  return { ...data, total }
}

export const getContainerMinersChartData = (
  containerModel: string,
  minerTailLogItem: EnergyReportTailLogItem | null | undefined,
  total: number,
): Record<string, number> & { total: number; actualMiners: number } => {
  if (!minerTailLogItem || Object.keys(minerTailLogItem).length === 0) {
    return {
      disconnected: total,
      total,
      actualMiners: 0,
    }
  }

  const data = (Object.keys(CONTAINER_POWER_MODES_MAP) as ContainerPowerModeTailLogKey[]).reduce<
    Record<string, number>
  >((accum, key) => {
    const modeKey = CONTAINER_POWER_MODES_MAP[key]
    const value = readEnergyReportTailLogBucketMetric(minerTailLogItem, key, containerModel)
    return { ...accum, [String(modeKey)]: value }
  }, {})

  const sumModes = Object.values(data).reduce((sum, n) => sum + n, 0)
  const disconnected = Math.max(0, total - sumModes)
  const actualMiners = total - disconnected

  return {
    ...data,
    disconnected,
    total,
    actualMiners: Math.max(0, actualMiners),
  }
}

export const buildPowerModeTableRows = (
  tailLog: EnergyReportTailLogItem[][] | undefined,
): PowerModeTableRow[] => {
  const tailLogItem = readEnergyReportTailLogHead(tailLog)
  return Object.values(COMPLETE_MINER_TYPES).map((type) => {
    const statusData = getMinersTypePowerModeChartData(type, tailLogItem)
    const count = readEnergyReportTailLogBucketMetric(
      tailLogItem,
      ENERGY_REPORT_TAIL_LOG_KEYS.TYPE_COUNT,
      type,
    )
    const powerW = readEnergyReportTailLogBucketMetric(
      tailLogItem,
      ENERGY_REPORT_TAIL_LOG_KEYS.POWER_W_TYPE_GROUP_SUM,
      type,
    )
    const formatted = formatPowerConsumption(powerW)

    return {
      minerType: MINER_TYPE_NAME_MAP[type] ?? type,
      count,
      power: `${formatted.value ?? 0} ${formatted.unit}`,
      ...statusData,
    }
  })
}

export const attachContainerMinerCounts = (
  containers: EnergyReportContainer[] | undefined,
  tailLog: EnergyReportTailLogItem[][] | undefined,
): EnergyReportContainer[] => {
  const tailLogItem = readEnergyReportTailLogHead(tailLog)
  const onlineByContainer = readEnergyReportTailLogNumericBucket(
    tailLogItem,
    ENERGY_REPORT_TAIL_LOG_KEYS.ACTIVE_CONTAINER_GROUP_COUNT,
  )

  return (containers ?? []).map((container) => {
    const key = container.containerId || container.info?.container || ''
    return {
      ...container,
      minersCount: onlineByContainer[key] ?? 0,
    }
  })
}
