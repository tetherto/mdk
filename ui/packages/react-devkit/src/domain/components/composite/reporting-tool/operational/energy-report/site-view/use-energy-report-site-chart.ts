import type { IChartApi, LegendItem, LineChartData } from '@primitives'
import { CHART_COLORS } from '@primitives'
import { useCallback, useMemo, useRef, useState } from 'react'

import { buildConsumptionData } from '../utils/consumption-line-chart-helper'
import { formatPowerConsumption } from '../../../../../../utils/device-utils'
import { SITE_POWER_SERIES_LABELS } from '../energy-report.constants'
import type { SitePowerConsumptionSlice } from '../energy-report.types'

type UseEnergyReportSiteChartInput = {
  powerConsumption: SitePowerConsumptionSlice
}

type UseEnergyReportSiteChartResult = {
  chartRef: React.RefObject<IChartApi | null>
  legendData: LegendItem[]
  lineChartData: LineChartData
  yTicksFormatter: (value: number) => string
  handleToggleDataset: (index: number) => void
  showNominal: boolean
}

export const useEnergyReportSiteChart = ({
  powerConsumption,
}: UseEnergyReportSiteChartInput): UseEnergyReportSiteChartResult => {
  const chartRef = useRef<IChartApi | null>(null)
  const [hidden, setHidden] = useState<Record<string, boolean>>({})

  const nominalValue = powerConsumption.nominalValue
  const showNominal = nominalValue != null && Number.isFinite(nominalValue) && nominalValue > 0

  const consumptionCardData = useMemo(
    () =>
      buildConsumptionData({
        data: powerConsumption.data.map(({ ts, consumption }) => ({ ts, consumption })),
        tag: 't-miner',
        skipMinMaxAvg: true,
        powerAttribute: 'consumption',
        label: SITE_POWER_SERIES_LABELS.consumption,
      }),
    [powerConsumption.data],
  )

  const legendData = useMemo((): LegendItem[] => {
    const items: LegendItem[] = [
      {
        label: SITE_POWER_SERIES_LABELS.consumption,
        color: CHART_COLORS.METALLIC_BLUE,
        hidden: !!hidden[SITE_POWER_SERIES_LABELS.consumption],
      },
    ]
    if (showNominal) {
      items.push({
        label: SITE_POWER_SERIES_LABELS.available,
        color: CHART_COLORS.red,
        hidden: !!hidden[SITE_POWER_SERIES_LABELS.available],
      })
    }
    return items
  }, [hidden, showNominal])

  const handleToggleDataset = useCallback(
    (index: number) => {
      const label = legendData[index]?.label
      if (!label) return
      setHidden((prev) => ({ ...prev, [label]: !prev[label] }))
    },
    [legendData],
  )

  const lineChartData = useMemo((): LineChartData => {
    const primary = consumptionCardData.datasets[0]
    const primaryPoints = primary?.data ?? []

    const datasets: LineChartData['datasets'] = [
      {
        label: SITE_POWER_SERIES_LABELS.consumption,
        borderColor: CHART_COLORS.METALLIC_BLUE,
        visible: !hidden[SITE_POWER_SERIES_LABELS.consumption],
        data: primaryPoints.map((p) => ({ x: p.x, y: p.y })),
      },
    ]

    if (showNominal && nominalValue != null) {
      datasets.push({
        label: SITE_POWER_SERIES_LABELS.available,
        borderColor: CHART_COLORS.red,
        visible: !hidden[SITE_POWER_SERIES_LABELS.available],
        data: primaryPoints.map((p) => ({ x: p.x, y: nominalValue })),
      })
    }

    return { datasets }
  }, [consumptionCardData.datasets, hidden, nominalValue, showNominal])

  return {
    chartRef,
    legendData,
    lineChartData,
    yTicksFormatter: useCallback((value: number) => {
      const formatted = formatPowerConsumption(value)
      return `${formatted.value ?? value} ${formatted.unit}`
    }, []),
    handleToggleDataset,
    showNominal,
  }
}
