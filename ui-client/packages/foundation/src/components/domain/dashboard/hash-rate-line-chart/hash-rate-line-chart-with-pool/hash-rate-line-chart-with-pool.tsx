import type { IChartApi } from '@mdk/core'
import { ChartContainer, LineChart } from '@mdk/core'
import type { ReactElement } from 'react'
import { useEffect, useRef, useState } from 'react'

import { DATE_RANGE } from '../../../../../constants'
import { CHART_TITLES } from '../../../../../constants/charts'
import { getHashrateString } from '../../../../../utils/device-utils'
import { getTimelineRadioButtons } from '../../../../../utils/timeline-dropdown-data-utils'
import type { HashRateLogEntry } from '../hash-rate-line-chart-utils'
import type { Timeline } from './hash-rate-line-chart-with-pool-constants'
import { CHART_MIN_HEIGHT } from './hash-rate-line-chart-with-pool-constants'
import type { MinerPoolDataItem } from './hash-rate-line-chart-with-pool-utils'
import {
  buildChartData,
  buildLegends,
  calculateAggrPoolData,
  calculateMinMaxAvg,
  calculateTimeRange,
  extractUniquePoolTypes,
  filterAndDownsampleMinerPoolData,
  getHashRateTimeRange,
  transformHashRateData,
} from './hash-rate-line-chart-with-pool-utils'
import './hash-rate-line-chart-with-pool.scss'

type HashRateLineChartWithPoolProps = {
  isOneMinEnabled: boolean
  minerTailLogData: HashRateLogEntry[] | HashRateLogEntry[][]
  isMinerTailLogLoading: boolean
  isMinerTailLogFetching: boolean
  minerPoolDataRaw: MinerPoolDataItem[]
  isMinerpoolInitialLoading: boolean
}

export const HashRateLineChartWithPool = ({
  isOneMinEnabled,
  minerTailLogData = [],
  isMinerTailLogLoading = false,
  isMinerTailLogFetching = false,
  minerPoolDataRaw = [],
  isMinerpoolInitialLoading = false,
}: Partial<HashRateLineChartWithPoolProps>): ReactElement => {
  const chartRef = useRef<IChartApi | null>(null)

  const [timeline, setTimeline] = useState<Timeline>(DATE_RANGE.M5)
  const [legendHidden, setLegendHidden] = useState<Record<string, boolean>>({})

  const [isFetching, setIsFetching] = useState(false)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (isMinerTailLogFetching) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      setIsFetching(true)
    } else if (isFetching) {
      rafRef.current = requestAnimationFrame(() => setIsFetching(false))
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [isMinerTailLogFetching, isFetching])

  const hashRateTimeRange = getHashRateTimeRange(minerTailLogData)
  const minerPoolData = filterAndDownsampleMinerPoolData(
    minerPoolDataRaw,
    hashRateTimeRange,
    timeline,
  )
  const hashRateData = transformHashRateData(minerTailLogData)
  const aggrPoolData = calculateAggrPoolData(minerPoolData)
  const hasData = hashRateData.length > 0 || (minerPoolData?.length ?? 0) > 0
  const minMaxAvg = calculateMinMaxAvg(hashRateData)
  const timeRange = calculateTimeRange(hashRateData)
  const uniquePoolTypes = extractUniquePoolTypes(minerPoolData)
  const legends = buildLegends(uniquePoolTypes, hasData)

  const chartData = buildChartData({
    legends,
    hashRateData,
    aggrPoolData,
    minerPoolData,
    legendHidden,
    timeRange,
  })

  const hasNoData = !chartData.datasets.some((ds) => ds.data && ds.data.length > 0)

  const handleLegendClick = (label: string) => {
    setLegendHidden((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  const timelineRadioButtons = getTimelineRadioButtons({ isOneMinEnabled })

  const legendData =
    !hasNoData && legends.length > 0
      ? legends.map((item) => ({
          label: item.label,
          color: item.color ?? '',
          hidden: legendHidden[item.label] ?? false,
        }))
      : undefined

  const isLoading = isMinerTailLogLoading || isMinerpoolInitialLoading

  return (
    <div className="mdk-hash-rate-line-chart-with-pool" style={{ minHeight: CHART_MIN_HEIGHT }}>
      <ChartContainer
        title={CHART_TITLES.HASH_RATE}
        legendData={legendData}
        onToggleDataset={(index) => handleLegendClick(legends[index]?.label ?? '')}
        loading={isLoading}
        empty={!isLoading && hasNoData}
        emptyMessage="No records found"
        minMaxAvg={
          !hasNoData
            ? {
                min: minMaxAvg.min ?? getHashrateString(0),
                max: minMaxAvg.max ?? getHashrateString(0),
                avg: minMaxAvg.avg ?? getHashrateString(0),
              }
            : undefined
        }
        timeRange={!hasNoData ? timeRange : undefined}
        rangeSelector={{
          options: timelineRadioButtons,
          value: timeline,
          onChange: (value) => setTimeline(value as Timeline),
        }}
      >
        <LineChart
          chartRef={chartRef}
          data={chartData}
          yTicksFormatter={(value: number) => getHashrateString(value)}
          timeline={timeline}
          shouldResetZoom={false}
        />
      </ChartContainer>
    </div>
  )
}
