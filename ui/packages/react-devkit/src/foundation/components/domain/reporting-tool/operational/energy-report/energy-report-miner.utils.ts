import type { MetricsConsumptionGroupedResponse } from '../../../../../types/metrics'
import type { Container } from '../../../../../types'
import { MINER_TYPE_NAME_MAP } from '../../../../../constants/device-constants'
import { getContainerName } from '../../../../../utils/container-utils'
import { isLeakedGroupedContainerKey } from '../../../../reporting-tool/utils/grouped-container-metrics'
import type { ToBarChartDataInput } from '../../../../reporting-tool/utils/to-bar-chart-data'
import { ENERGY_REPORT_BAR_SERIES_LABEL, ENERGY_REPORT_MINER_VIEW_SLICES } from './energy-report.constants'
import { powerWattsToChartMegawatts } from './energy-report-chart.constants'
import type {
  EnergyReportBarChartLegacy,
  EnergyReportMinerSliceConfig,
  EnergyReportMinerViewSlice,
} from './energy-report.types'

export { ENERGY_REPORT_MINER_VIEW_SLICES } from './energy-report.constants'

export const sliceConfig: Record<EnergyReportMinerViewSlice, EnergyReportMinerSliceConfig> = {
  [ENERGY_REPORT_MINER_VIEW_SLICES.MINER_TYPE]: {
    groupBy: 'miner',
    title: ENERGY_REPORT_BAR_SERIES_LABEL,
    getLabelName: (category) =>
      MINER_TYPE_NAME_MAP[category as keyof typeof MINER_TYPE_NAME_MAP] ?? category,
  },
  [ENERGY_REPORT_MINER_VIEW_SLICES.MINER_UNIT]: {
    groupBy: 'container',
    title: ENERGY_REPORT_BAR_SERIES_LABEL,
    filterCategory: (category) => !isLeakedGroupedContainerKey(category),
    getLabelName: (category, containers) => {
      const container = containers?.find((c) => c.info?.container === category)
      const label =
        container?.type != null
          ? getContainerName(category, container.type)
          : getContainerName(category)
      return label || category
    },
  },
}

export const transformToBarData = (
  response: MetricsConsumptionGroupedResponse | undefined,
  slice: EnergyReportMinerViewSlice,
  containers: Container[] = [],
): EnergyReportBarChartLegacy => {
  const config = sliceConfig[slice]
  const latest = response?.log?.[response.log.length - 1]
  const powerW = latest?.powerW ?? {}

  const entries = Object.entries(powerW)
  const filtered = config.filterCategory
    ? entries.filter(([key]) => config.filterCategory!(key))
    : entries

  return {
    labels: filtered.map(([key]) => config.getLabelName(key, containers)),
    dataSet1: {
      label: config.title,
      data: filtered.map(([, value]) => value),
    },
  }
}

export const toEnergyReportBarChartInput = (
  response: MetricsConsumptionGroupedResponse | undefined,
  slice: EnergyReportMinerViewSlice,
  containers: Container[] = [],
): ToBarChartDataInput => {
  const bar = transformToBarData(response, slice, containers)
  return {
    labels: bar.labels,
    series: [
      {
        label: bar.dataSet1.label,
        values: bar.dataSet1.data.map((watts) => powerWattsToChartMegawatts(watts)),
      },
    ],
  }
}
