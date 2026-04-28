import type { IChartApi, UnknownRecord } from '@tetherto/mdk-core-ui'
import { ChartContainer, formatUnit, LineChart, secondsToMs } from '@tetherto/mdk-core-ui'
import _last from 'lodash/last'
import _map from 'lodash/map'
import _round from 'lodash/round'
import type { ReactElement } from 'react'
import { useMemo, useRef, useState } from 'react'
import { removeContainerPrefix } from '../../../utils/device-utils'

type ChartLine = {
  backendAttribute: string
  label: string
  borderColor: string
  borderWidth?: number
  visible?: boolean
}

export type ChartDataPayload = {
  unit?: string
  lines?: ChartLine[]
  currentValueLabel?: {
    backendAttribute?: string
    decimals?: number
  }
  valueFormatter?: (value: number) => number
  valueDecimals?: number
}

export type ContainerChartsBuilderProps = {
  tag?: string
  chartDataPayload?: ChartDataPayload
  chartTitle?: string
  dateRange?: { start?: number; end?: number }
  data?: Array<UnknownRecord>
  timeline?: string
  fixedTimezone?: string
  height?: number
  showLegend?: boolean
  showRangeSelector?: boolean
  rangeOptions?: Array<{ label: string; value: string }>
  footer?: React.ReactNode
}

const DEFAULT_RANGE_OPTIONS = [
  { label: '5 Min', value: '5m' },
  { label: '30 Min', value: '30m' },
  { label: '3 H', value: '3h' },
  { label: '1 D', value: '1D' },
]

const ContainerChartsBuilder = ({
  tag,
  chartDataPayload,
  chartTitle,
  data = [],
  timeline: initialTimeline = '24h',
  fixedTimezone,
  height,
  showLegend = true,
  showRangeSelector = true,
  rangeOptions = DEFAULT_RANGE_OPTIONS,
  footer,
}: ContainerChartsBuilderProps): ReactElement | null => {
  const chartRef = useRef<IChartApi | null>(null)
  const [selectedTimeline, setSelectedTimeline] = useState(initialTimeline)

  const [chartData, setChartData] = useState(() => {
    if (!chartDataPayload || !data.length) {
      return { datasets: [] }
    }

    const { lines } = chartDataPayload
    const pureTag = removeContainerPrefix(String(tag || ''))

    const datasets = _map(lines || [], (line: ChartLine) => {
      const lineData = _map(data, (entry: UnknownRecord) => {
        const tsInSeconds = (entry.ts as number) || 0
        const x = secondsToMs(tsInSeconds)

        const containerStats = entry?.container_specific_stats_group_aggr as
          | Record<string, UnknownRecord>
          | undefined
        const groupData = pureTag
          ? (containerStats?.[pureTag] as UnknownRecord | undefined)
          : undefined

        return {
          x,
          y: groupData?.[line.backendAttribute] as number | undefined,
        }
      })

      return {
        label: line.label,
        data: lineData,
        borderColor: line.borderColor,
        borderWidth: line.borderWidth || 2,
        visible: line.visible !== false,
      }
    })

    return { datasets }
  })

  // Update chart data when props change
  useMemo(() => {
    if (!chartDataPayload || !data.length) {
      setChartData({ datasets: [] })
      return
    }

    const { lines } = chartDataPayload
    const pureTag = removeContainerPrefix(String(tag || ''))

    const datasets = _map(lines || [], (line: ChartLine) => {
      const lineData = _map(data, (entry: UnknownRecord) => {
        const tsInSeconds = (entry.ts as number) || 0
        const x = tsInSeconds * 1000

        const containerStats = entry?.container_specific_stats_group_aggr as
          | Record<string, UnknownRecord>
          | undefined
        const groupData = pureTag
          ? (containerStats?.[pureTag] as UnknownRecord | undefined)
          : undefined

        return {
          x,
          y: groupData?.[line.backendAttribute] as number | undefined,
        }
      })

      return {
        label: line.label,
        data: lineData,
        borderColor: line.borderColor,
        borderWidth: line.borderWidth || 2,
        visible: line.visible !== false,
      }
    })

    setChartData({ datasets })
  }, [chartDataPayload, data, tag])

  const yTicksFormatter = useMemo(() => {
    if (!chartDataPayload) return undefined

    const { unit, valueFormatter } = chartDataPayload

    return (value: number): string => {
      const formattedValue = valueFormatter ? valueFormatter(value) : value
      return formatUnit({ value: _round(formattedValue, 3), unit })
    }
  }, [chartDataPayload])

  const currentValue = useMemo(() => {
    if (!chartDataPayload || !data.length) return undefined

    const { currentValueLabel, unit } = chartDataPayload
    const pureTag = removeContainerPrefix(String(tag || ''))

    const lastEntry = _last(data)
    const value = (
      lastEntry?.container_specific_stats_group_aggr as Record<string, UnknownRecord> | undefined
    )?.[pureTag]?.[currentValueLabel?.backendAttribute as string] as number | undefined

    if (value === undefined) return undefined

    return {
      value: _round(value, currentValueLabel?.decimals ?? 2),
      unit: unit || '',
    }
  }, [chartDataPayload, data, tag])

  const legendData = useMemo(() => {
    if (!showLegend || !chartData.datasets.length) return undefined

    return chartData.datasets.map((ds) => ({
      label: ds.label as string,
      color: ds.borderColor,
      hidden: !ds.visible,
    }))
  }, [showLegend, chartData.datasets])

  const handleToggleDataset = (index: number): void => {
    setChartData((prev) => ({
      ...prev,
      datasets: prev.datasets.map((ds, i) => (i === index ? { ...ds, visible: !ds.visible } : ds)),
    }))
  }

  if (!chartDataPayload) {
    return null
  }

  return (
    <ChartContainer
      title={chartTitle}
      highlightedValue={currentValue}
      legendData={legendData}
      onToggleDataset={handleToggleDataset}
      rangeSelector={
        showRangeSelector
          ? {
              options: rangeOptions,
              value: selectedTimeline,
              onChange: setSelectedTimeline,
            }
          : undefined
      }
      footer={footer}
    >
      <LineChart
        chartRef={chartRef}
        data={chartData}
        height={height}
        yTicksFormatter={yTicksFormatter}
        roundPrecision={chartDataPayload.valueDecimals}
        timeline={selectedTimeline}
        fixedTimezone={fixedTimezone}
      />
    </ChartContainer>
  )
}

export default ContainerChartsBuilder
