import type { IChartApi } from '@mdk/core'
import { ChartContainer, LineChart } from '@mdk/core'
import type { ReactElement } from 'react'
import { useCallback, useMemo, useRef, useState } from 'react'

import { DATE_RANGE } from '../../../../constants'
import { CHART_TITLES } from '../../../../constants/charts'
import { getTimelineRadioButtons } from '../../../../utils/timeline-dropdown-data-utils'
import type { HashRateLogEntry } from './hash-rate-line-chart-utils'
import { getHashRateGraphData } from './hash-rate-line-chart-utils'

type HashRateLineChartProps = {
  data: HashRateLogEntry[]
  realtimeHashrateData: HashRateLogEntry
  isOneMinEnabled: boolean
  fixedTimezone: string
  height: number
  loading: boolean
}

export const HashRateLineChart = ({
  data = [],
  realtimeHashrateData,
  isOneMinEnabled,
  fixedTimezone,
  height,
  loading,
}: Partial<HashRateLineChartProps>): ReactElement => {
  const chartRef = useRef<IChartApi | null>(null)

  const timelineRadioButtons = getTimelineRadioButtons({ isOneMinEnabled })

  const [selectedTimeline, setSelectedTimeline] = useState(
    () => timelineRadioButtons[0]?.value ?? DATE_RANGE.M5,
  )

  const [hiddenMap, setHiddenMap] = useState<Record<string, boolean>>({})

  const graphData = useMemo(
    () => getHashRateGraphData(data, realtimeHashrateData),
    [data, realtimeHashrateData],
  )
  const graphDataRef = useRef(graphData)
  graphDataRef.current = graphData

  const handleToggleDataset = useCallback((index: number) => {
    const label = graphDataRef.current?.datasets[index]?.label

    if (!label) return

    setHiddenMap((prev) => ({ ...prev, [label]: !prev[label] }))
  }, [])

  const highlightedValue = useMemo(() => {
    if (!graphData.currentValueLabel) return undefined

    const parsed = graphData.currentValueLabel

    const displayValue =
      typeof parsed === 'object' && parsed !== null && 'value' in parsed
        ? parsed.value
        : String(graphData.currentValueLabel)

    const displayUnit =
      typeof parsed === 'object' && parsed !== null && 'unit' in parsed ? parsed.unit : ''

    return { value: displayValue ?? '', unit: displayUnit ?? '' }
  }, [graphData.currentValueLabel])

  const legendData = useMemo(
    () =>
      graphData.datasets.map((ds) => ({
        label: ds.label,
        color: ds.borderColor,
        hidden: !!hiddenMap[ds.label],
      })),
    [graphData.datasets, hiddenMap],
  )

  const lineChartData = useMemo(
    () => ({
      datasets: graphData.datasets.map((ds) => ({
        ...ds,
        visible: !hiddenMap[ds.label],
      })),
    }),
    [graphData.datasets, hiddenMap],
  )

  return (
    <ChartContainer
      title={CHART_TITLES.HASH_RATE}
      highlightedValue={highlightedValue}
      legendData={legendData}
      onToggleDataset={handleToggleDataset}
      loading={loading}
      empty={!loading && data.length === 0}
      minMaxAvg={graphData.minMaxAvg}
      timeRange={graphData.timeRange}
      rangeSelector={{
        options: timelineRadioButtons,
        value: selectedTimeline,
        onChange: setSelectedTimeline,
      }}
    >
      <LineChart
        chartRef={chartRef}
        data={lineChartData}
        height={height}
        yTicksFormatter={graphData.yTicksFormatter}
        timeline={selectedTimeline}
        fixedTimezone={fixedTimezone}
        shouldResetZoom={false}
      />
    </ChartContainer>
  )
}
