import { MINER_TYPE_NAME_MAP } from '../../../../constants/device-constants'
import type { ToBarChartDataInput } from '../../utils/to-bar-chart-data'
import { MINER_TYPE_VIEW_SERIES_LABEL, TAIL_LOG_MINER_TYPE_KEY } from './efficiency.constants'

// Tail-log shape for stat-5m / t-miner.
// TODO(BE-follow-up): swap input type when /auth/metrics/efficiency ships groupBy=miner.
export type EfficiencyMinerTypeTailLog = Record<string, unknown>

export type OperationsEfficiencyMinerTypeInput = {
  tailLog?: EfficiencyMinerTypeTailLog | null
}

export type OperationsEfficiencyMinerTypeResult = {
  chartInput: ToBarChartDataInput
  isEmpty: boolean
}

export const toOperationsEfficiencyMinerType = ({
  tailLog,
}: OperationsEfficiencyMinerTypeInput): OperationsEfficiencyMinerTypeResult => {
  const group = (tailLog?.[TAIL_LOG_MINER_TYPE_KEY] ?? {}) as Record<string, number>
  const categories = Object.keys(group).sort()

  const labels = categories.map(
    (cat) => MINER_TYPE_NAME_MAP[cat as keyof typeof MINER_TYPE_NAME_MAP] ?? cat,
  )
  const values = categories.map((cat) => group[cat] ?? 0)

  return {
    chartInput: {
      labels,
      series: [{ label: MINER_TYPE_VIEW_SERIES_LABEL, values }],
    },
    isEmpty: categories.length === 0,
  }
}
