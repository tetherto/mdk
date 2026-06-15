import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { PERIOD } from '@/constants/ranges'
import type { FinancialDateRange } from '../../../utils/financial-period'

import { CostCharts } from '../cost-charts'
import { OperationsEnergyChart } from '../operations-energy-chart'
import { ProductionCostChart } from '../production-cost-chart'

vi.mock('@core', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    BarChart: ({ data }: { data: { labels: string[]; isEmpty?: boolean } }) => (
      <div data-testid="bar-chart" data-labels={data.labels.join(',')} />
    ),
    DoughnutChart: ({ data }: { data: { label: string; value: number }[] }) => (
      <div data-testid="doughnut-chart" data-slices={data.map((d) => d.label).join(',')} />
    ),
    ChartContainer: ({ empty, children }: { empty?: boolean; children: React.ReactNode }) =>
      empty ? <div data-testid="empty-state" /> : <>{children}</>,
  }
})

const dateRange: FinancialDateRange = {
  start: new Date('2025-01-01').getTime(),
  end: new Date('2025-03-31').getTime(),
  period: PERIOD.MONTHLY,
}

const costLog = [
  {
    ts: new Date('2025-01-15').getTime(),
    totalCostUSD: 1000,
    energyCostUSD: 700,
    operationalCostUSD: 300,
  },
  {
    ts: new Date('2025-02-15').getTime(),
    totalCostUSD: 1200,
    energyCostUSD: 800,
    operationalCostUSD: 400,
  },
]

const btcPriceLog = [
  { ts: new Date('2025-01-15').getTime(), priceUSD: 60_000 },
  { ts: new Date('2025-02-15').getTime(), priceUSD: 61_000 },
]

describe('ProductionCostChart', () => {
  it('builds bar chart labels from the cost log timestamps via period bucketing', () => {
    render(
      <ProductionCostChart costLog={costLog} btcPriceLog={btcPriceLog} dateRange={dateRange} />,
    )

    expect(screen.getByTestId('bar-chart')).toHaveAttribute('data-labels', '2025-01,2025-02')
  })

  it('renders the empty state when there is no data', () => {
    render(<ProductionCostChart costLog={[]} btcPriceLog={[]} dateRange={dateRange} />)

    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
  })
})

describe('OperationsEnergyChart', () => {
  it('renders both slices when both totals are positive', () => {
    render(
      <OperationsEnergyChart
        totals={{
          totalEnergyCostsUSD: 1500,
          totalOperationalCostsUSD: 750,
          totalCostsUSD: 2250,
          totalConsumptionMWh: 125,
        }}
      />,
    )

    expect(screen.getByTestId('doughnut-chart')).toHaveAttribute('data-slices', 'Operations,Energy')
  })

  it('drops slices whose totals are zero (avoids rendering 0-value slivers)', () => {
    render(
      <OperationsEnergyChart
        totals={{
          totalEnergyCostsUSD: 1500,
          totalOperationalCostsUSD: 0,
          totalCostsUSD: 1500,
          totalConsumptionMWh: 100,
        }}
      />,
    )

    expect(screen.getByTestId('doughnut-chart')).toHaveAttribute('data-slices', 'Energy')
  })

  it('renders the empty state when no totals are provided', () => {
    render(<OperationsEnergyChart totals={null} />)

    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
  })
})

describe('CostCharts wrapper', () => {
  it('composes the production-cost, avg all-in cost and operations-energy charts', () => {
    render(
      <CostCharts
        costLog={costLog}
        btcPriceLog={btcPriceLog}
        totals={null}
        dateRange={dateRange}
      />,
    )

    // production-cost renders a bar chart, the other two render empty-state (no data passed)
    expect(screen.getAllByTestId('bar-chart')).toHaveLength(1)
    expect(screen.getAllByTestId('empty-state')).toHaveLength(2)
  })
})
