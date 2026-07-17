import { ThresholdLineChart, UNITS } from '@tetherto/mdk-react-devkit/primitives'

import type { JSX } from 'react'

import {
  THRESHOLD_LINE_CHART_EMPTY,
  THRESHOLD_LINE_CHART_MULTI_SERIES,
  THRESHOLD_LINE_CHART_POWER,
} from './threshold-line-chart-page.fixtures'

const formatChartValue = (value: number, unit?: string): string =>
  unit ? `${value.toFixed(2)} ${unit}` : value.toFixed(2)

export const ThresholdLineChartPage = (): JSX.Element => {
  return (
    <section className="demo-section">
      <h2 className="demo-section__title">Threshold Line Chart</h2>
      <p className="demo-section__description">
        Line chart with one or more series and optional horizontal threshold lines. Used in mining
        reports for power, hashrate, and efficiency metrics.
      </p>
      <p className="demo-section__resize-hint">
        ← Resize the window horizontally to see charts adapt →
      </p>
      <div className="demo-section__charts demo-section__charts--1-col">
        <section>
          <h3>Power vs availability threshold</h3>
          <ThresholdLineChart
            title="Power Consumption"
            data={THRESHOLD_LINE_CHART_POWER}
            unit={UNITS.ENERGY_MW}
            yTicksFormatter={(value) => formatChartValue(value, UNITS.ENERGY_MW)}
          />
        </section>

        <section>
          <h3>Multi-series with target line</h3>
          <ThresholdLineChart
            title="Hashrate Comparison"
            data={THRESHOLD_LINE_CHART_MULTI_SERIES}
            unit={UNITS.HASHRATE_PH_S}
            yTicksFormatter={(value) => formatChartValue(value, UNITS.HASHRATE_PH_S)}
          />
        </section>

        <section>
          <h3>Empty state (all zero values)</h3>
          <ThresholdLineChart
            title="Power Consumption"
            data={THRESHOLD_LINE_CHART_EMPTY}
            yTicksFormatter={(value) => formatChartValue(value)}
          />
        </section>
      </div>
    </section>
  )
}
