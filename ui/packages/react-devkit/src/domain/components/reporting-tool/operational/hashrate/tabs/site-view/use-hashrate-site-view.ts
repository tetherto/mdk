import type { DateRange, IChartApi, LegendItem, LineChartData } from '@primitives'
import { endOfDay } from 'date-fns/endOfDay'
import { startOfDay } from 'date-fns/startOfDay'
import { useCallback, useMemo, useRef, useState } from 'react'

import { SITE_HASHRATE_COLOR } from '../../hashrate-chart-shared'
import type { HashrateDateRange } from '../../hashrate.constants'
import { SITE_VIEW_SERIES_LABEL } from '../../hashrate.constants'
import { transformToSiteViewData } from '../../hashrate-utils'
import type { HashrateGroupedLog } from '../../hashrate.types'

type UseHashrateSiteViewInput = {
  log: HashrateGroupedLog
  selectedMinerTypes: string[]
  onDateRangeChange?: (range: HashrateDateRange) => void
}

type UseHashrateSiteViewResult = {
  chartRef: React.RefObject<IChartApi | null>
  legendData: LegendItem[]
  lineChartData: LineChartData
  isEmpty: boolean
  handleRangeSelect: (selected: DateRange | undefined) => void
  handleToggleDataset: (index: number) => void
}

export const useHashrateSiteView = ({
  log,
  selectedMinerTypes,
  onDateRangeChange,
}: UseHashrateSiteViewInput): UseHashrateSiteViewResult => {
  const chartRef = useRef<IChartApi | null>(null)
  const [hidden, setHidden] = useState<Record<string, boolean>>({})

  const legendData = useMemo(
    (): LegendItem[] => [
      {
        label: SITE_VIEW_SERIES_LABEL,
        color: SITE_HASHRATE_COLOR,
        hidden: !!hidden[SITE_VIEW_SERIES_LABEL],
      },
    ],
    [hidden],
  )

  const handleToggleDataset = useCallback(
    (index: number) => {
      const label = legendData[index]?.label
      if (!label) return
      setHidden((prev) => ({ ...prev, [label]: !prev[label] }))
    },
    [legendData],
  )

  const lineChartData = useMemo((): LineChartData => {
    const result = transformToSiteViewData(log, selectedMinerTypes)
    const series = result.series[0]
    if (!series) return { datasets: [] }
    return {
      datasets: [
        {
          label: series.label,
          borderColor: series.color ?? SITE_HASHRATE_COLOR,
          visible: !hidden[SITE_VIEW_SERIES_LABEL],
          data: series.points.map((p) => ({ x: new Date(p.ts).getTime(), y: p.value })),
        },
      ],
    }
  }, [log, selectedMinerTypes, hidden])

  const isEmpty =
    lineChartData.datasets.length === 0 || lineChartData.datasets[0]?.data.length === 0

  const handleRangeSelect = useCallback(
    (selected: DateRange | undefined) => {
      if (!selected?.from || !onDateRangeChange) return
      onDateRangeChange({
        start: startOfDay(selected.from).getTime(),
        end: endOfDay(selected.to ?? selected.from).getTime(),
      })
    },
    [onDateRangeChange],
  )

  return {
    chartRef,
    legendData,
    lineChartData,
    isEmpty,
    handleRangeSelect,
    handleToggleDataset,
  }
}
