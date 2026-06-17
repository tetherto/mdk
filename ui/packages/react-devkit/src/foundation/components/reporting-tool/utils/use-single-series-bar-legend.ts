import type { LegendItem } from '@core'
import { useCallback, useMemo, useState } from 'react'

export type UseSingleSeriesBarLegendInput = {
  seriesLabel: string
  color: string
}

export type UseSingleSeriesBarLegendResult = {
  legendData: LegendItem[]
  handleToggleDataset: (index: number) => void
  isSeriesHidden: boolean
}

/** Legend toggle state for reporting bar charts with a single dataset series. */
export const useSingleSeriesBarLegend = ({
  seriesLabel,
  color,
}: UseSingleSeriesBarLegendInput): UseSingleSeriesBarLegendResult => {
  const [hidden, setHidden] = useState<Record<string, boolean>>({})

  const legendData = useMemo(
    (): LegendItem[] => [
      {
        label: seriesLabel,
        color,
        hidden: !!hidden[seriesLabel],
      },
    ],
    [seriesLabel, color, hidden],
  )

  const handleToggleDataset = useCallback(
    (index: number) => {
      const label = legendData[index]?.label
      if (!label) return
      setHidden((prev) => ({ ...prev, [label]: !prev[label] }))
    },
    [legendData],
  )

  return {
    legendData,
    handleToggleDataset,
    isSeriesHidden: !!hidden[seriesLabel],
  }
}
