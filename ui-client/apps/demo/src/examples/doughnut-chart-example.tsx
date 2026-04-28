import { DoughnutChart } from '@tetherto/core'
import type { ChartTooltipConfig } from '@tetherto/core'
import React from 'react'
import {
  DOUGHNUT_CHART_MINER_STATUS,
  DOUGHNUT_CHART_MINER_TYPES,
  DOUGHNUT_CHART_SITE_DISTRIBUTION,
} from '../constants/demo-chart-data'

const doughnutTooltip: ChartTooltipConfig = {
  valueFormatter: (v) => `${v} units`,
  mode: 'nearest',
  intersect: true,
}

export const DoughnutChartExample: React.FC = () => {
  return (
    <>
      <p className="demo-section__resize-hint">
        ← Resize the window horizontally to see charts adapt →
      </p>
      <div className="demo-section__charts demo-section__charts--2-col">
        <section>
          <h3>Miner Types</h3>
          <DoughnutChart data={DOUGHNUT_CHART_MINER_TYPES} tooltip={doughnutTooltip} />
        </section>

        <section>
          <h3>Miner Status</h3>
          <DoughnutChart data={DOUGHNUT_CHART_MINER_STATUS} tooltip={doughnutTooltip} />
        </section>

        <section>
          <h3>Site Distribution (auto colors)</h3>
          <DoughnutChart data={DOUGHNUT_CHART_SITE_DISTRIBUTION} tooltip={doughnutTooltip} />
        </section>

        <section>
          <h3>Legend Right</h3>
          <DoughnutChart
            data={DOUGHNUT_CHART_MINER_STATUS}
            legendPosition="right"
            tooltip={doughnutTooltip}
          />
        </section>

        <section>
          <h3>Legend Left</h3>
          <DoughnutChart
            data={DOUGHNUT_CHART_MINER_TYPES}
            legendPosition="left"
            tooltip={doughnutTooltip}
          />
        </section>

        <section>
          <h3>Legend Bottom</h3>
          <DoughnutChart
            data={DOUGHNUT_CHART_SITE_DISTRIBUTION}
            legendPosition="bottom"
            height={180}
            tooltip={doughnutTooltip}
          />
        </section>
      </div>
    </>
  )
}
