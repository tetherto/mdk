import { AverageDowntimeChart } from '@tetherto/mdk-react-devkit/primitives'

import type { JSX } from 'react'

import {
  AVERAGE_DOWNTIME_ALL_ZEROS,
  AVERAGE_DOWNTIME_CURTAILMENT_ONLY,
  AVERAGE_DOWNTIME_NO_PERIODS,
  AVERAGE_DOWNTIME_SAMPLE,
} from './average-downtime-chart-page.fixtures'

export const AverageDowntimeChartPage = (): JSX.Element => (
  <section className="demo-section">
    <h2 className="demo-section__title">Average Downtime Chart</h2>
    <p className="demo-section__description">
      Stacked bar chart of curtailment vs operational downtime rates (%), matching the mining OS
      energy revenue panel.
    </p>
    <div className="demo-section__charts demo-section__charts--1-col">
      <section>
        <h3>Curtailment and op. issues</h3>
        <AverageDowntimeChart data={AVERAGE_DOWNTIME_SAMPLE} />
      </section>

      <section>
        <h3>Curtailment only (op. issues zero)</h3>
        <AverageDowntimeChart data={AVERAGE_DOWNTIME_CURTAILMENT_ONLY} />
      </section>

      <section>
        <h3>All zero rates (0% downtime)</h3>
        <AverageDowntimeChart data={AVERAGE_DOWNTIME_ALL_ZEROS} />
      </section>

      <section>
        <h3>Empty state (no periods)</h3>
        <AverageDowntimeChart data={AVERAGE_DOWNTIME_NO_PERIODS} />
      </section>
    </div>
  </section>
)
