import { MAINTENANCE_CONTAINER } from '../../../../constants/container-constants'
import type { Container } from '../../../../types'
import { getContainerName } from '../../../../utils/container-utils'
import type { ToBarChartDataInput } from '../../utils/to-bar-chart-data'
import { MINER_UNIT_VIEW_SERIES_LABEL, TAIL_LOG_CONTAINER_KEY } from './efficiency.constants'

// Tail-log shape for stat-5m / t-miner.
// TODO(BE-follow-up): swap input type when /auth/metrics/efficiency ships groupBy=container.
export type EfficiencyMinerUnitTailLog = Record<string, unknown>

export type OperationsEfficiencyMinerUnitInput = {
  tailLog?: EfficiencyMinerUnitTailLog | null
  containers?: Container[]
}

export type OperationsEfficiencyMinerUnitResult = {
  chartInput: ToBarChartDataInput
  isEmpty: boolean
}

const resolveContainerLabel = (id: string, containers: Container[]): string => {
  const match = containers.find((c) => c.info?.container === id)
  const type = match?.type
  return type == null ? id : getContainerName(id, type)
}

export const toOperationsEfficiencyMinerUnit = ({
  tailLog,
  containers = [],
}: OperationsEfficiencyMinerUnitInput): OperationsEfficiencyMinerUnitResult => {
  const group = (tailLog?.[TAIL_LOG_CONTAINER_KEY] ?? {}) as Record<string, number>

  const categories = Object.keys(group)
    .filter(
      (key) =>
        !key.includes(MAINTENANCE_CONTAINER) &&
        Number.isFinite(group[key] as number) &&
        (group[key] as number) >= 0,
    )
    .sort()

  const labels = categories.map((cat) => resolveContainerLabel(cat, containers))
  const values = categories.map((cat) => group[cat] ?? 0)

  return {
    chartInput: {
      labels,
      series: [{ label: MINER_UNIT_VIEW_SERIES_LABEL, values }],
    },
    isEmpty: categories.length === 0,
  }
}
