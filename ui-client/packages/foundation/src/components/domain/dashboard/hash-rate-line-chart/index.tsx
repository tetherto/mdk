import type { ReactElement } from 'react'

import { HashRateLineChart } from './hash-rate-line-chart'
import type { HashRateLogEntry } from './hash-rate-line-chart-utils'
import { HashRateLineChartWithPool } from './hash-rate-line-chart-with-pool/hash-rate-line-chart-with-pool'
import type { MinerPoolDataItem } from './hash-rate-line-chart-with-pool/hash-rate-line-chart-with-pool-utils'

type HashRateLineChartSelectorProps = {
  tag: string
  hasPoolLine: boolean
  dateRange: { start?: number; end?: number }
  data: HashRateLogEntry[]
  realtimeHashrateData: HashRateLogEntry
  isOneMinEnabled: boolean
  fixedTimezone: string
  height: number
  loading: boolean
  minerTailLogData: HashRateLogEntry[] | HashRateLogEntry[][]
  isMinerTailLogLoading: boolean
  isMinerTailLogFetching: boolean
  minerPoolDataRaw: MinerPoolDataItem[]
  isMinerpoolInitialLoading: boolean
}

export const HashRateLineChartSelector = ({
  hasPoolLine = false,
  data,
  realtimeHashrateData,
  isOneMinEnabled,
  fixedTimezone,
  height,
  loading,
  minerTailLogData,
  isMinerTailLogLoading,
  isMinerTailLogFetching,
  minerPoolDataRaw,
  isMinerpoolInitialLoading,
}: Partial<HashRateLineChartSelectorProps>): ReactElement => {
  if (hasPoolLine) {
    return (
      <HashRateLineChartWithPool
        isOneMinEnabled={isOneMinEnabled}
        minerTailLogData={minerTailLogData}
        isMinerTailLogLoading={isMinerTailLogLoading}
        isMinerTailLogFetching={isMinerTailLogFetching}
        minerPoolDataRaw={minerPoolDataRaw}
        isMinerpoolInitialLoading={isMinerpoolInitialLoading}
      />
    )
  }

  return (
    <HashRateLineChart
      data={data}
      realtimeHashrateData={realtimeHashrateData}
      isOneMinEnabled={isOneMinEnabled}
      fixedTimezone={fixedTimezone}
      height={height}
      loading={loading}
    />
  )
}
