import type {
  DetailLegendItem,
  IChartApi,
  LegendItem,
  LineChartData,
  RangeSelectorOption,
} from '@core'
import {
  ChartContainer,
  ChartStatsFooter,
  cn,
  DetailLegend,
  getChartDataAvailability,
  getChartLegendItemStyles,
  LineChart,
  withErrorBoundary,
} from '@core'

import { ChartWrapper } from '../chart-wrapper'

import type {
  LineChartCardData,
  LineChartCardDataset,
  LineChartCardProps,
  TimelineOption,
} from './types'
import { type CSSProperties, useCallback, useMemo, useRef, useState } from 'react'

const mapToRangeSelectorOptions = (options: TimelineOption[]): RangeSelectorOption[] =>
  options.map(({ label, value }) => ({
    label,
    value,
  }))

const legendStrokeColor = (borderColor: string): string =>
  getChartLegendItemStyles(borderColor, false).stroke

const mapToLegendItems = (
  datasets: LineChartCardDataset[],
  hiddenMap: Record<string, boolean>,
): LegendItem[] =>
  datasets
    .filter((ds) => ds.label)
    .map((ds) => ({
      label: ds.label!,
      color: legendStrokeColor(ds.borderColor),
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
    borderColor: legendStrokeColor(ds.borderColor),
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
  headerAction,
  titleExtra,
}: LineChartCardProps) => {
  const [legendHidden, setLegendHidden] = useState<Record<string, boolean>>({})
  const [internalTimeline, setInternalTimeline] = useState(
    defaultTimeline ?? timelineOptions?.[0]?.value ?? '5m',
  )
  const internalChartRef = useRef<IChartApi | null>(null)
  const chartRef = externalChartRef ?? internalChartRef

  // Determine active timeline (controlled vs uncontrolled)
  const timeline = controlledTimeline ?? internalTimeline

  // Resolve data: either from direct prop or rawData+adapter
  const chartData: LineChartCardData | undefined = useMemo(() => {
    if (dataProp) return dataProp
    if (rawData != null && dataAdapter) return dataAdapter(rawData)
    return undefined
  }, [dataProp, rawData, dataAdapter])

  const handleTimelineChange = useCallback(
    (newTimeline: string) => {
      chartRef.current?.timeScale().resetTimeScale()
      if (controlledTimeline === undefined) {
        setInternalTimeline(newTimeline)
      }
      onTimelineChange?.(newTimeline)
    },
    [controlledTimeline, onTimelineChange, chartRef],
  )

  const handleLegendToggle = useCallback((label: string) => {
    setLegendHidden((prev) => ({
      ...prev,
      [label]: !prev[label],
    }))
  }, [])

  const datasets = chartData?.datasets ?? []
  const labeledDatasets = useMemo(
    () => datasets.filter((ds) => ds.label),
    [datasets],
  )

  const handleLegendToggleByIndex = useCallback(
    (index: number) => {
      const dataset = labeledDatasets[index]
      if (dataset?.label) {
        handleLegendToggle(dataset.label)
      }
    },
    [labeledDatasets, handleLegendToggle],
  )

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
        } as CSSProperties & Record<string, any>
      }
    >
      <ChartContainer
        title={title}
        titleExtra={titleExtra}
        headerAction={headerAction}
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

/**
 * Composable line-chart card with title, timeline range selector, legend
 * (basic or detailed), error boundary, and an optional min/max/avg footer.
 *
 * Accepts either pre-shaped `data` or `rawData` + a `dataAdapter` callback so
 * upstream domain components can keep their data wrangling local.
 *
 * @category charts
 * @domain generic
 * @tier agent-ready
 *
 * @example
 * ```tsx
 * <LineChartCard
 *   title="Hashrate"
 *   data={chartData}
 *   timelineOptions={[{ label: '5m', value: '5m' }, { label: '1h', value: '1h' }]}
 *   defaultTimeline="5m"
 * />
 * ```
 */
export const LineChartCard = withErrorBoundary(LineChartCardInner, 'LineChartCard')

export type {
  LineChartCardData,
  LineChartCardDataset,
  LineChartCardProps,
  TimelineOption,
} from './types'
