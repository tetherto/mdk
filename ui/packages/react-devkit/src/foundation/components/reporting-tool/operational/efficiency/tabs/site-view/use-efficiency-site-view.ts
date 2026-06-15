import type { DateRange, IChartApi, LegendItem, LineChartData } from '@core'
import { CHART_COLORS } from '@core'
import { endOfDay } from 'date-fns/endOfDay'
import { startOfDay } from 'date-fns/startOfDay'
import { useCallback, useMemo, useRef, useState } from 'react'
import type { MetricsEfficiencyLogEntry } from '../../../../../../types'
import type { EfficiencyDateRange } from '../../efficiency.constants'
import { SITE_VIEW_SERIES_LABELS } from '../../efficiency.constants'

type UseEfficiencySiteViewInput = {
  log: MetricsEfficiencyLogEntry[]
  nominalValue: number | null
  onDateRangeChange?: (range: EfficiencyDateRange) => void
}

type UseEfficiencySiteViewResult = {
  chartRef: React.RefObject<IChartApi | null>
  legendData: LegendItem[]
  lineChartData: LineChartData
  handleRangeSelect: (selected: DateRange | undefined) => void
  handleToggleDataset: (index: number) => void
}

export const useEfficiencySiteView = ({
  log,
  nominalValue,
  onDateRangeChange,
}: UseEfficiencySiteViewInput): UseEfficiencySiteViewResult => {
  const chartRef = useRef<IChartApi | null>(null)
  const [hidden, setHidden] = useState<Record<string, boolean>>({})

  const legendData = useMemo(
    (): LegendItem[] => [
      {
        label: SITE_VIEW_SERIES_LABELS.actual,
        color: CHART_COLORS.blue,
        hidden: !!hidden[SITE_VIEW_SERIES_LABELS.actual],
      },
      ...(nominalValue != null
        ? [
            {
              label: SITE_VIEW_SERIES_LABELS.nominal,
              color: CHART_COLORS.red,
              hidden: !!hidden[SITE_VIEW_SERIES_LABELS.nominal],
            },
          ]
        : []),
    ],
    [nominalValue, hidden],
  )

  const handleToggleDataset = useCallback(
    (index: number) => {
      const label = legendData[index]?.label
      if (!label) return
      setHidden((prev) => ({ ...prev, [label]: !prev[label] }))
    },
    [legendData],
  )

  const lineChartData = useMemo(
    (): LineChartData => ({
      datasets: [
        {
          label: SITE_VIEW_SERIES_LABELS.actual,
          borderColor: CHART_COLORS.blue,
          visible: !hidden[SITE_VIEW_SERIES_LABELS.actual],
          data: log.map(({ ts, efficiencyWThs }) => ({ x: ts, y: efficiencyWThs })),
        },
        ...(nominalValue != null
          ? [
              {
                label: SITE_VIEW_SERIES_LABELS.nominal,
                borderColor: CHART_COLORS.red,
                visible: !hidden[SITE_VIEW_SERIES_LABELS.nominal],
                data: log.map(({ ts }) => ({ x: ts, y: nominalValue })),
              },
            ]
          : []),
      ],
    }),
    [log, nominalValue, hidden],
  )

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

  return { chartRef, legendData, lineChartData, handleRangeSelect, handleToggleDataset }
}
