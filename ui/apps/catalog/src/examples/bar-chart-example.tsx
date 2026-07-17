import { BarChart, ChartContainer, CURRENCY, UNITS } from '@tetherto/mdk-react-devkit/primitives'
import type { ChartTooltipConfig } from '@tetherto/mdk-react-devkit/primitives'
import { DemoPageHeader } from '../components/demo-page-header'
import {
  BAR_CHART_GROUPED_SITES,
  BAR_CHART_HORIZONTAL_MINERS,
  BAR_CHART_MINERS_STATUS,
  BAR_CHART_MINING_OUTPUT,
  BAR_CHART_STACKED_REVENUE,
  BAR_CHART_SUBSIDY_FEES,
} from '../constants/demo-chart-data'
import type { FC } from 'react'

const miningOutputTooltip: ChartTooltipConfig = {
  valueFormatter: (value) => `${value.toLocaleString()} ${UNITS.HASHRATE_TH_S}`,
}

const revenueTooltip: ChartTooltipConfig = {
  valueFormatter: (value) => `${value.toLocaleString()} ${CURRENCY.BTC_LABEL}`,
}

const hashRateTooltip: ChartTooltipConfig = {
  valueFormatter: (value) => `${value.toLocaleString()} ${UNITS.HASHRATE_PH_S}`,
}

const minersTooltip: ChartTooltipConfig = {
  valueFormatter: (value) => value.toLocaleString(),
}

const subsidyFeesTooltip: ChartTooltipConfig = {
  valueFormatter: (value, item) =>
    item.dataset.yAxisID === 'y1'
      ? `${value.toFixed(2)}${UNITS.PERCENT}`
      : `${value.toFixed(2)} ${CURRENCY.BTC_LABEL}`,
}

export const BarChartExample: FC = () => (
  <section className="demo-section">
    <DemoPageHeader title="Bar Chart" />
    <p className="demo-section__resize-hint">
      ← Resize the window horizontally to see charts adapt →
    </p>
    <div className="demo-section__charts">
      <section>
        <h3>Bar Chart</h3>
        <ChartContainer title="Mining output">
          <BarChart height={250} data={BAR_CHART_MINING_OUTPUT} tooltip={miningOutputTooltip} />
        </ChartContainer>
      </section>

      <section>
        <h3>Stacked Bar Chart</h3>
        <ChartContainer title="Revenue by site (stacked)">
          <BarChart
            height={250}
            data={BAR_CHART_STACKED_REVENUE}
            isStacked
            tooltip={revenueTooltip}
          />
        </ChartContainer>
      </section>

      <section>
        <h3>Grouped Bar Chart</h3>
        <ChartContainer title="Hash rate by site (grouped)">
          <BarChart height={250} data={BAR_CHART_GROUPED_SITES} tooltip={hashRateTooltip} />
        </ChartContainer>
      </section>

      <section>
        <h3>Horizontal Bar Chart</h3>
        <ChartContainer title="Miners by type">
          <BarChart
            height={280}
            data={BAR_CHART_HORIZONTAL_MINERS}
            isHorizontal
            showLegend={false}
            tooltip={minersTooltip}
          />
        </ChartContainer>
      </section>

      <section>
        <h3>Stacked Bar Chart (legend bottom)</h3>
        <ChartContainer title="Miners Status">
          <BarChart
            height={300}
            data={BAR_CHART_MINERS_STATUS}
            isStacked
            legendPosition="bottom"
            legendAlign="start"
            tooltip={minersTooltip}
          />
        </ChartContainer>
      </section>

      <section>
        <h3>Bar + Line with Data Labels</h3>
        <ChartContainer title="Subsidy/Fees">
          <BarChart
            height={250}
            data={BAR_CHART_SUBSIDY_FEES}
            isStacked
            showDataLabels
            legendPosition="bottom"
            legendAlign="start"
            formatDataLabel={(value) => value.toFixed(2)}
            tooltip={subsidyFeesTooltip}
            options={{
              scales: {
                y1: {
                  position: 'right',
                  beginAtZero: true,
                  grid: { drawOnChartArea: false },
                  ticks: {
                    color: 'rgba(255,255,255,0.6)',
                    callback: (v: string | number) => `${v}${UNITS.PERCENT}`,
                  },
                },
              },
            }}
          />
        </ChartContainer>
      </section>
    </div>
  </section>
)
