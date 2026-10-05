import type { IChartApi, UnknownRecord } from '@primitives'
import { ChartContainer, formatUnit, LineChart, secondsToMs } from '@primitives'
import _last from 'lodash/last'
import _map from 'lodash/map'
import _round from 'lodash/round'
import type { ReactElement } from 'react'
import { useMemo, useRef, useState } from 'react'
import { removeContainerPrefix } from '../../utils/device-utils'

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
  /** Container tag (any leading prefix is stripped) */
  tag?: string
  /** Declarative chart configuration */
  chartDataPayload?: ChartDataPayload
  /** Title shown in the chart header */
  chartTitle?: string
  /** Custom date range as Unix epoch seconds. Currently unused — accepted by the shared props type but not read by the chart components. */
  dateRange?: { start?: number; end?: number }
  /**
   * Raw container telemetry entries (with `ts` + nested stats group)
   * @default []
   */
  data?: Array<UnknownRecord>
  /**
   * Initial / controlled timeline value
   * @default "24h"
   */
  timeline?: string
  /** IANA timezone for x-axis ticks */
  fixedTimezone?: string
  /** Chart pixel height */
  height?: number
  /**
   * Show the toggleable legend
   * @default true
   */
  showLegend?: boolean
  /**
   * Show the range selector buttons
   * @default true
   */
  showRangeSelector?: boolean
  /**
   * Override the default range selector options
   * @default 5m/30m/3h/1D
   */
  rangeOptions?: Array<{ label: string; value: string }>
  /** Footer (e.g. min/max/avg stats) */
  footer?: React.ReactNode
}

const DEFAULT_RANGE_OPTIONS = [
  { label: '5 Min', value: '5m' },
  { label: '30 Min', value: '30m' },
  { label: '3 H', value: '3h' },
  { label: '1 D', value: '1D' },
]

/**
 * Generic, declarative chart builder for container telemetry.
 *
 * @category charts
 * @domain device-telemetry
 * @kernelCapability device-telemetry
 * @tier agent-ready
 */
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
          Record<string, UnknownRecord> | undefined
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
          Record<string, UnknownRecord> | undefined
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
