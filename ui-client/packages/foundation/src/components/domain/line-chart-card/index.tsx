import * as React from 'react'

import type {
  DetailLegendItem,
  IChartApi,
  LegendItem,
  LineChartData,
  RangeSelectorOption,
} from '@tetherto/mdk-core-ui'
import {
  ChartContainer,
  ChartStatsFooter,
  cn,
  DetailLegend,
  getChartDataAvailability,
  LineChart,
  withErrorBoundary,
} from '@tetherto/mdk-core-ui'

import { ChartWrapper } from '../chart-wrapper'

import type {
  LineChartCardData,
  LineChartCardDataset,
  LineChartCardProps,
  TimelineOption,
} from './types'

const mapToRangeSelectorOptions = (options: TimelineOption[]): RangeSelectorOption[] =>
  options.map(({ label, value }) => ({
    label,
    value,
  }))

const mapToLegendItems = (
  datasets: LineChartCardDataset[],
  hiddenMap: Record<string, boolean>,
): LegendItem[] =>
  datasets
    .filter((ds) => ds.label)
    .map((ds) => ({
      label: ds.label!,
      color: ds.borderColor,
      hidden: !!hiddenMap[ds.label!],
    }))

const mapToDetailLegendItems = (
  datasets: LineChartCardDataset[],
  hiddenMap: Record<string, boolean>,
): DetailLegendItem[] =>
  datasets
    .filter((ds) => ds.label)
    .map((ds) => ({
      label: ds.label!,
      color: ds.borderColor,
      icon: ds.legendIcon,
      currentValue: ds.currentValue,
      percentChange: ds.percentChange,
      hidden: !!hiddenMap[ds.label!],
    }))

const mapToLineChartData = (
  datasets: LineChartCardDataset[],
  hiddenMap: Record<string, boolean>,
): LineChartData => ({
  datasets: datasets.map((ds) => ({
    label: ds.label,
    borderColor: ds.borderColor,
    data: ds.data,
    visible: !hiddenMap[ds.label ?? ''],
  })),
})

const LineChartCardInner = ({
  data: dataProp,
  rawData,
  dataAdapter,
  timelineOptions,
  timeline: controlledTimeline,
  defaultTimeline,
  onTimelineChange,
  title,
  detailLegends = false,
  isLoading = false,
  shouldResetZoom = true,
  chartProps,
  chartRef: externalChartRef,
  minHeight = 350,
  className,
}: LineChartCardProps) => {
  const [legendHidden, setLegendHidden] = React.useState<Record<string, boolean>>({})
  const [internalTimeline, setInternalTimeline] = React.useState(
    defaultTimeline ?? timelineOptions?.[0]?.value ?? '5m',
  )
  const internalChartRef = React.useRef<IChartApi | null>(null)
  const chartRef = externalChartRef ?? internalChartRef

  // Determine active timeline (controlled vs uncontrolled)
  const timeline = controlledTimeline ?? internalTimeline

  // Resolve data: either from direct prop or rawData+adapter
  const chartData: LineChartCardData | undefined = React.useMemo(() => {
    if (dataProp) return dataProp
    if (rawData != null && dataAdapter) return dataAdapter(rawData)
    return undefined
  }, [dataProp, rawData, dataAdapter])

  const handleTimelineChange = React.useCallback(
    (newTimeline: string) => {
      chartRef.current?.timeScale().resetTimeScale()
      if (controlledTimeline === undefined) {
        setInternalTimeline(newTimeline)
      }
      onTimelineChange?.(newTimeline)
    },
    [controlledTimeline, onTimelineChange, chartRef],
  )

  const handleLegendToggle = React.useCallback((label: string) => {
    setLegendHidden((prev) => ({
      ...prev,
      [label]: !prev[label],
    }))
  }, [])

  const handleLegendToggleByIndex = React.useCallback(
    (index: number) => {
      const dataset = chartData?.datasets[index]
      if (dataset?.label) {
        handleLegendToggle(dataset.label)
      }
    },
    [chartData, handleLegendToggle],
  )

  // Build visible data (apply legend hidden state)
  const datasets = chartData?.datasets ?? []
  const lineChartData = mapToLineChartData(datasets, legendHidden)

  const hasData = getChartDataAvailability(
    lineChartData.datasets as Parameters<typeof getChartDataAvailability>[0],
  )

  // Build range selector
  const rangeSelector = timelineOptions
    ? {
        options: mapToRangeSelectorOptions(timelineOptions),
        value: timeline,
        onChange: handleTimelineChange,
      }
    : undefined

  // Build legend
  const legendData =
    !detailLegends && datasets.length > 0 ? mapToLegendItems(datasets, legendHidden) : undefined

  // Build detail legend as custom header addon
  const detailLegendNode =
    detailLegends && datasets.length > 0 ? (
      <DetailLegend
        items={mapToDetailLegendItems(datasets, legendHidden)}
        onToggle={handleLegendToggle}
      />
    ) : null

  // Build footer
  const footer =
    chartData && (chartData.minMaxAvg || chartData.footerStats || chartData.secondaryLabel) ? (
      <ChartStatsFooter
        minMaxAvg={chartData.minMaxAvg}
        stats={chartData.footerStats}
        statsPerColumn={chartData.footerStatsPerColumn}
        secondaryLabel={chartData.secondaryLabel}
      />
    ) : undefined

  return (
    <div
      className={cn('mdk-line-chart-card', className)}
      style={
        {
          '--mdk-line-chart-card-min-height':
            typeof minHeight === 'number' ? `${minHeight}px` : minHeight,
        } as React.CSSProperties & Record<string, any>
      }
    >
      <ChartContainer
        title={title}
        legendData={legendData}
        highlightedValue={chartData?.highlightedValue}
        rangeSelector={rangeSelector}
        loading={isLoading}
        empty={!isLoading && !hasData}
        emptyMessage="No records found"
        footer={footer}
        onToggleDataset={handleLegendToggleByIndex}
      >
        {detailLegendNode && <div className="mdk-line-chart-card__legends">{detailLegendNode}</div>}
        <ChartWrapper
          data={lineChartData}
          isLoading={isLoading}
          showNoDataPlaceholder={false}
          minHeight={200}
        >
          <LineChart
            chartRef={chartRef}
            data={lineChartData}
            yTicksFormatter={chartData?.yTicksFormatter}
            priceFormatter={chartData?.priceFormatter}
            skipRound={chartData?.skipRound}
            timeline={timeline}
            shouldResetZoom={shouldResetZoom}
            {...chartProps}
          />
        </ChartWrapper>
      </ChartContainer>
    </div>
  )
}

/** LineChartCard - Composable card with timeline selector, legend, chart, and stats footer */
export const LineChartCard = withErrorBoundary(LineChartCardInner, 'LineChartCard')

export type {
  LineChartCardData,
  LineChartCardDataset,
  LineChartCardProps,
  TimelineOption,
} from './types'
