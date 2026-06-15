import { CHART_COLORS, ChartContainer, CURRENCY, DoughnutChart, UNITS } from '@core'
import { useMemo } from 'react'

import { miningReportDoughnutChartTooltip } from './mining-report-chart.constants'

export type ReportOperationsEnergyCostChartProps = {
  data?: {
    energyCostsUSD?: number
    operationalCostsUSD?: number
  }
  title?: string
  isLoading?: boolean
}

export const ReportOperationsEnergyCostChart = ({
  data,
  isLoading = false,
  title = 'Operations vs Energy Cost',
}: ReportOperationsEnergyCostChartProps) => {
  const chartSlices = useMemo(() => {
    const slices: { label: string; value: number; color: string }[] = []
    if (data?.operationalCostsUSD) {
      slices.push({
        label: 'Operations',
        value: data.operationalCostsUSD,
        color: CHART_COLORS.VIOLET,
      })
    }
    if (data?.energyCostsUSD) {
      slices.push({
        label: 'Energy',
        value: data.energyCostsUSD,
        color: CHART_COLORS.SKY_BLUE,
      })
    }
    return slices
  }, [data?.energyCostsUSD, data?.operationalCostsUSD])

  const empty = !isLoading && chartSlices.length === 0

  const unit = `${CURRENCY.USD}/${UNITS.ENERGY_MWH}`
  const tooltip = useMemo(() => miningReportDoughnutChartTooltip(unit), [unit])

  return (
    <section className="mdk-mining-report__chart-panel">
      <div className="mdk-mining-report-chart">
        <ChartContainer title={title} loading={isLoading} empty={empty}>
        {!empty && (
          <DoughnutChart
            data={chartSlices}
            unit={unit}
            height={200}
            legendPosition="bottom"
            formatValue={(v) => v.toFixed(2)}
            tooltip={tooltip}
          />
        )}
        </ChartContainer>
      </div>
    </section>
  )
}
