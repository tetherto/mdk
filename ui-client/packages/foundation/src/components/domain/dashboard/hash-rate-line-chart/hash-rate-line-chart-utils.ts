import { CHART_COLORS, getTimeRange } from '@tetherto/mdk-core-ui'
import { WEBAPP_DISPLAY_NAME } from '../../../../constants'
import { getHashrateString, getHashrateUnit } from '../../../../utils/device-utils'

export type HashRateLogEntry = {
  ts: number
  hashrate_mhs_1m_sum_aggr?: number
  [key: string]: unknown
}

export type HashRateDataPoint = {
  x: number
  y: number
}

export const getHashRateGraphData = (
  data: HashRateLogEntry[],
  realtimeHashRateData?: HashRateLogEntry,
) => {
  let totalAvgHashRate = 0
  let minHashRate = Number.MAX_SAFE_INTEGER
  let maxHashRate = Number.MIN_SAFE_INTEGER

  const actualData: HashRateDataPoint[] = data.map((entry) => {
    const x = entry.ts as number
    const sumHashRate = entry.hashrate_mhs_1m_sum_aggr ?? 0

    totalAvgHashRate += sumHashRate

    if (sumHashRate < minHashRate) minHashRate = sumHashRate
    if (sumHashRate > maxHashRate) maxHashRate = sumHashRate

    return { x, y: sumHashRate }
  })

  const minMaxAvg = {
    min: getHashrateString(minHashRate),
    max: getHashrateString(maxHashRate),
    avg: getHashrateString(totalAvgHashRate / (data.length || 1)),
  }

  const timeRange = getTimeRange(data.at(-1)?.ts ?? 0, data[0]?.ts ?? 0)

  const currentValue =
    realtimeHashRateData?.hashrate_mhs_1m_sum_aggr ?? data.at(-1)?.hashrate_mhs_1m_sum_aggr ?? 0

  return {
    yTicksFormatter: (value: number) => getHashrateString(value),
    currentValueLabel: getHashrateUnit(currentValue),
    minMaxAvg,
    timeRange,
    datasets: [
      {
        type: 'line',
        label: `${WEBAPP_DISPLAY_NAME} Hash Rate`,
        data: actualData,
        borderColor: CHART_COLORS.SKY_BLUE,
        pointRadius: 1,
      },
    ],
  }
}
