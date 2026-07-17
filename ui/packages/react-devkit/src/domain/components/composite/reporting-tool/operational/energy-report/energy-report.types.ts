import type { CompleteMinerTypeValue } from '../../../../../constants/device-constants'
import type { Container } from '../../../../../types'
import type {
  MetricsConsumptionGroupBy,
  MetricsConsumptionGroupedResponse,
  MetricsConsumptionLogEntry,
} from '../../../../../types/metrics'
import type { ToBarChartDataInput } from '../../../../reporting-tool/utils/to-bar-chart-data'

import type {
  ENERGY_REPORT_MINER_VIEW_SLICES,
  ENERGY_REPORT_TAB_TYPES,
  EnergyReportDateRange,
} from './energy-report.constants'

export type EnergyReportTabValue =
  (typeof ENERGY_REPORT_TAB_TYPES)[keyof typeof ENERGY_REPORT_TAB_TYPES]

export type EnergyReportMinerViewSlice =
  (typeof ENERGY_REPORT_MINER_VIEW_SLICES)[keyof typeof ENERGY_REPORT_MINER_VIEW_SLICES]

export type EnergyReportTailLogNumericBucket = Record<string, number>

export type EnergyReportTailLogItem = Record<
  string,
  EnergyReportTailLogNumericBucket | number | undefined
>

export type EnergyReportContainer = Container & {
  containerId?: string
  minersCount?: number
}

export type PowerModeTableRow = {
  minerType: string
  count: number
  power: string
  [mode: string]: string | number
}

export type SitePowerConsumptionSlice = {
  data: Array<{ ts: number; consumption: number }>
  nominalValue: number | null
  isLoading: boolean
  error?: unknown
}

export type UseEnergyReportSiteInput = {
  consumptionError?: unknown
  tailLogLoading?: boolean
  containersLoading?: boolean
  consumptionLoading?: boolean
  consumptionFetching?: boolean
  nominalConfigLoading?: boolean
  dateRange: EnergyReportDateRange
  containers?: EnergyReportContainer[]
  tailLog?: EnergyReportTailLogItem[][]
  nominalPowerAvailabilityMw?: number | null
  consumptionLog?: MetricsConsumptionLogEntry[]
}

export type EnergyReportContainerChartData = Record<string, number> & {
  total: number
  actualMiners: number
}

export type EnergyReportMiningUnitCard = {
  container: EnergyReportContainer
  containerId: string
  chartData: EnergyReportContainerChartData
}

export type UseEnergyReportSiteResult = {
  isLoading: boolean
  powerModeData: PowerModeTableRow[]
  refetchSnapshotData?: VoidFunction
  containers: EnergyReportContainer[]
  tailLogData: EnergyReportTailLogItem[][]
  tailLogHead: EnergyReportTailLogItem | undefined
  miningUnitCards: EnergyReportMiningUnitCard[]
  powerConsumptionData: SitePowerConsumptionSlice
}

export type EnergyReportSiteViewProps = Omit<UseEnergyReportSiteInput, 'dateRange'> & {
  snapshotLoading?: boolean
  onRefetchSnapshot?: VoidFunction
  dateRange: EnergyReportDateRange
  onDateRangeChange?: (range: EnergyReportDateRange) => void
}

export type EnergyReportBarViewProps = {
  title: string
  isEmpty?: boolean
  isLoading?: boolean
  chartInput?: ToBarChartDataInput
  onTimeFrameChange?: (start: Date, end: Date) => void
}

export type EnergyReportGroupedBarViewProps = {
  isLoading?: boolean
  containers?: Container[]
  groupedConsumption?: MetricsConsumptionGroupedResponse
  onTimeFrameChange?: EnergyReportBarViewProps['onTimeFrameChange']
}

export type EnergyReportMinerTypeViewProps = EnergyReportGroupedBarViewProps

export type EnergyReportMinerUnitViewProps = EnergyReportGroupedBarViewProps

export type EnergyReportProps = {
  defaultTab?: EnergyReportTabValue
  siteView?: Omit<EnergyReportSiteViewProps, 'dateRange'> & {
    dateRange?: EnergyReportDateRange
  }
  minerTypeView?: EnergyReportMinerTypeViewProps
  minerUnitView?: EnergyReportMinerUnitViewProps
  className?: string
}

export type EnergyReportMinerTypeKey = CompleteMinerTypeValue

export type EnergyReportMinerSliceConfig = {
  title: string
  groupBy: MetricsConsumptionGroupBy
  filterCategory?: (category: string) => boolean
  getLabelName: (category: string, containers?: Container[]) => string
}

export type EnergyReportBarChartLegacy = {
  labels: string[]
  dataSet1: { label: string; data: number[] }
}
