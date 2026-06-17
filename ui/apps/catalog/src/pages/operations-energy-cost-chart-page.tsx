import { OperationsEnergyCostChart } from '@tetherto/mdk-react-devkit/core'

import type { JSX } from 'react'

import {
  OPERATIONS_ENERGY_COST_EMPTY,
  OPERATIONS_ENERGY_COST_OPERATIONS_ONLY,
  OPERATIONS_ENERGY_COST_SAMPLE,
} from './operations-energy-cost-chart-page.fixtures'

export const OperationsEnergyCostChartPage = (): JSX.Element => (
  <section className="demo-section">
    <h2 className="demo-section__title">Operations vs Energy Cost Chart</h2>
    <p className="demo-section__description">
      Doughnut breakdown of operational vs energy cost (USD/MWh), matching the mining OS cost and
      report panels.
    </p>
    <div className="demo-section__charts demo-section__charts--1-col">
      <section>
        <h3>Operations and energy</h3>
        <OperationsEnergyCostChart data={OPERATIONS_ENERGY_COST_SAMPLE} />
      </section>

      <section>
        <h3>Operations only (energy cost zero)</h3>
        <OperationsEnergyCostChart data={OPERATIONS_ENERGY_COST_OPERATIONS_ONLY} />
      </section>

      <section>
        <h3>Empty state (all zero values)</h3>
        <OperationsEnergyCostChart data={OPERATIONS_ENERGY_COST_EMPTY} />
      </section>
    </div>
  </section>
)
