import { AreaChart, ChartContainer } from '@tetherto/core'
import type { ChartTooltipConfig } from '@tetherto/core'
import React from 'react'
import { DemoPageHeader } from '../components/demo-page-header'
import {
  AREA_CHART_HASHRATE_TREND,
  AREA_CHART_HASHRATE_TREND_BLUE,
} from '../constants/demo-chart-data'

const areaTooltip: ChartTooltipConfig = {
  valueFormatter: (v) => `${v.toFixed(2)} PH/s`,
}

export const AreaChartExample: React.FC = () => {
  return (
    <section className="demo-section">
      <DemoPageHeader title="Area Chart" />
      <p className="demo-section__resize-hint">
        ← Resize the window horizontally to see charts adapt →
      </p>
      <div className="demo-section__charts demo-section__charts--1-col">
        <section>
          <ChartContainer title="Hashrate trend">
            <AreaChart height={250} data={AREA_CHART_HASHRATE_TREND} tooltip={areaTooltip} />
          </ChartContainer>
        </section>
        <section>
          <ChartContainer title="Hashrate trend – custom color">
            <AreaChart height={250} data={AREA_CHART_HASHRATE_TREND_BLUE} tooltip={areaTooltip} />
          </ChartContainer>
        </section>
      </div>
    </section>
  )
}
