import { ChartContainer, COLOR, LineChart } from '@core'
import { useMemo, useState } from 'react'

import type { LineChartData } from '../lib/chart-builders'

const hasLineData = (data?: LineChartData): boolean => {
  if (!data?.series?.length) return false
  return data.series.some((s) => s.points.some((p) => p.value !== 0))
}

const toTimestamp = (ts: string): number => {
  const parsed = Date.parse(ts)
  return Number.isFinite(parsed) ? parsed : 0
}

const toCoreLineData = (data: LineChartData) => {
  const timestamps = data.series[0]?.points.map((p) => toTimestamp(p.ts)) ?? []
  const seriesDatasets = data.series.map((s) => ({
    label: s.label,
    borderColor: s.color ?? COLOR.ORANGE_WARNING,
    data: s.points.map((p) => ({ x: toTimestamp(p.ts), y: p.value })),
  }))
  const constantDatasets =
    data.constants?.map((c) => ({
      label: c.label,
      borderColor: c.color ?? COLOR.GRASS_GREEN,
      data: timestamps.map((ts) => ({ x: ts, y: c.value })),
    })) ?? []

  return { datasets: [...seriesDatasets, ...constantDatasets] }
}

export type ReportLineChartProps = {
  title?: string
  data?: LineChartData
  unit?: string
  timeframeType?: string
  isLegendVisible?: boolean
  fullHeight?: boolean
  fillArea?: boolean
  yTicksFormatter?: (value: number) => string
}

export const ReportLineChart = ({
  title,
  data,
  unit,
  isLegendVisible = true,
  fullHeight = false,
  yTicksFormatter,
}: ReportLineChartProps) => {
  const [visibility, setVisibility] = useState<boolean[]>([])
  const empty = !hasLineData(data)

  const lineData = useMemo(() => (data ? toCoreLineData(data) : { datasets: [] }), [data])

  const dataWithVisibility = useMemo(
    () => ({
      datasets: lineData.datasets.map((ds, i) => ({
        ...ds,
        visible: visibility[i] ?? true,
      })),
    }),
    [lineData.datasets, visibility],
  )

  const legendData = lineData.datasets.map((ds, i) => ({
    label: ds.label as string,
    color: ds.borderColor as string,
    hidden: !(visibility[i] ?? true),
  }))

  const handleToggle = (index: number): void => {
    setVisibility((prev) => {
      const next = lineData.datasets.map((_, i) => prev[i] ?? true)
      next[index] = !next[index]
      return next
    })
  }

  const titleWithUnit = title && unit ? `${title} (${unit})` : title

  const axisFormatter =
    yTicksFormatter ??
    ((value: number) => (unit ? `${value} ${unit}` : String(value)))

  return (
    <section className="mdk-mining-report__chart-panel">
      <div
        className={
          fullHeight ? 'mdk-mining-report-chart mdk-mining-report-chart--fill' : 'mdk-mining-report-chart'
        }
      >
        <ChartContainer
          title={titleWithUnit}
          empty={empty}
          legendData={isLegendVisible ? legendData : undefined}
          onToggleDataset={isLegendVisible ? handleToggle : undefined}
        >
          {!empty && (
            <LineChart
              data={dataWithVisibility}
              height={fullHeight ? 360 : 280}
              unit={unit ?? ''}
              yTicksFormatter={axisFormatter}
              backgroundColor="transparent"
            />
          )}
        </ChartContainer>
      </div>
    </section>
  )
}

export default ReportLineChart
