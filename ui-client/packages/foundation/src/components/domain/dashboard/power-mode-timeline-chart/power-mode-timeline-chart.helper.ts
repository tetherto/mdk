import { getTimezoneOffset } from 'date-fns-tz'
import _flatten from 'lodash/flatten'
import _isUndefined from 'lodash/isUndefined'
import _keys from 'lodash/keys'
import _reduce from 'lodash/reduce'
import _values from 'lodash/values'

import { PowerModeColors } from '../../../../utils/device-utils'
import { MinerStatusColors } from '../../explorer/details-view/miners-activity-chart/miners-activity-chart.const'
import type { TimelineChartData } from '../../timeline-chart'

export type PowerModeTimelineEntry = {
  ts?: number
  power_mode_group_aggr?: Record<string, string>
  status_group_aggr?: Record<string, string>
  [key: string]: unknown
}

export type MinerPowerModeTimeline = {
  ts?: number
  miner?: string
  powerMode?: string
  data?: {
    from?: number
    to?: number
  }
}

export type PowerModeTimelineDataset = {
  label: string
  data: Array<{ x: [number, number]; y: string | undefined }>
  color: string
}

export type PowerModeTimelineChartData = {
  labels: string[]
  datasets: PowerModeTimelineDataset[]
}

export const getCombinedPowerModeTimelineByMiner = (
  data: PowerModeTimelineEntry[],
): Record<string, MinerPowerModeTimeline[]> =>
  _reduce(
    data,
    (acc: Record<string, MinerPowerModeTimeline[]>, entry: PowerModeTimelineEntry) => {
      const { ts, power_mode_group_aggr, status_group_aggr } = entry || {}

      const statusGroup = status_group_aggr as Record<string, string> | undefined
      const powerModeGroup = power_mode_group_aggr as Record<string, string> | undefined

      if (statusGroup) {
        for (const miner in statusGroup) {
          if (!acc[miner]) {
            acc[miner] = []
          }
          const powerMode = powerModeGroup?.[miner] || statusGroup[miner]
          const lastIndex = acc[miner].length - 1
          const lastEntry = acc[miner][lastIndex]

          if (lastEntry && lastEntry.powerMode === powerMode && lastEntry?.data?.to) {
            if (lastEntry.data) {
              lastEntry.data.to = ts
            }
          } else {
            acc[miner].push({
              ts,
              miner,
              powerMode,
              data: { from: ts, to: ts },
            })
          }
        }
      }

      return acc
    },
    {} as Record<string, MinerPowerModeTimeline[]>,
  )

const getTimezoneTs = (x: number | undefined, timezone: string): number => {
  if (_isUndefined(x)) return 0
  const offset = getTimezoneOffset(timezone)

  return x + offset
}

const getPowerModeColor = (powerMode: string): string => {
  const powerModeValue = PowerModeColors[powerMode as keyof typeof PowerModeColors]

  if (powerModeValue) {
    return powerModeValue
  }

  const minerStatusValue = MinerStatusColors[powerMode as keyof typeof MinerStatusColors]

  if (minerStatusValue) {
    return minerStatusValue
  }

  return 'var(--mdk-color-gray-500)'
}

export const getPowerModeTimelineDatasetObject = (
  combinedPowerModeTimelineByMiner: Record<string, MinerPowerModeTimeline[]>,
  timezone: string,
): Record<string, PowerModeTimelineDataset> =>
  _reduce(
    _flatten(_values(combinedPowerModeTimelineByMiner)),
    (
      acc: Record<string, PowerModeTimelineDataset>,
      minerPowerModeTimeline: MinerPowerModeTimeline,
    ) => {
      const powerMode = minerPowerModeTimeline.powerMode || ''
      if (!acc[powerMode]) {
        acc[powerMode] = {
          label: powerMode,
          data: [],
          color: getPowerModeColor(powerMode),
        }
      }
      acc[powerMode].data.push({
        x: [
          getTimezoneTs(minerPowerModeTimeline.data?.from, timezone),
          getTimezoneTs(minerPowerModeTimeline.data?.to, timezone),
        ],
        y: minerPowerModeTimeline.miner,
      })
      return acc
    },
    {} as Record<string, PowerModeTimelineDataset>,
  )

export const getPowerModeTimelineChartData = (
  data: PowerModeTimelineEntry[] | undefined,
  timezone: string,
): PowerModeTimelineChartData => {
  if (!data) {
    return {
      labels: [],
      datasets: [],
    }
  }
  const combinedPowerModeTimelineByMiner = getCombinedPowerModeTimelineByMiner(data)
  const powerModeTimelineDatasetObject = getPowerModeTimelineDatasetObject(
    combinedPowerModeTimelineByMiner,
    timezone,
  )
  return {
    labels: _keys(combinedPowerModeTimelineByMiner),
    datasets: _values(powerModeTimelineDatasetObject),
  }
}

export const transformToTimelineChartData = (
  helperData: PowerModeTimelineChartData,
): TimelineChartData => ({
  labels: helperData.labels,
  datasets: helperData.datasets.map((dataset: PowerModeTimelineDataset) => ({
    label: dataset.label,
    data: dataset.data,
    color: dataset.color,
  })),
})
