import { CURRENCY, UNITS } from '@primitives'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PERIOD } from '@domain/constants/ranges'
import type { FinancialDateRange } from '../../../utils/financial-period'

import type { CostSummaryDisplayMetrics } from '../build-cost-summary-view-model'
import { Cost } from '../cost'
import type { CostProps } from '../cost.types'

const USD_PER_MWH = `${CURRENCY.USD}/${UNITS.ENERGY_MWH}`

const metrics: CostSummaryDisplayMetrics = {
  allInCost: { label: 'All-in Cost', unit: USD_PER_MWH, value: 18, isHighlighted: true },
  energyCost: { label: 'Energy Cost', unit: USD_PER_MWH, value: 12 },
  operationsCost: { label: 'Operations Cost', unit: USD_PER_MWH, value: 6 },
}

const dateRange: FinancialDateRange = {
  start: new Date('2025-01-01').getTime(),
  end: new Date('2025-01-31').getTime(),
  period: PERIOD.MONTHLY,
}

const buildProps = (overrides: Partial<CostProps> = {}): CostProps => ({
  metrics,
  costLog: [],
  btcPriceLog: [],
  totals: null,
  dateRange,
  controls: <div data-testid="period-controls" />,
  ...overrides,
})

describe('Cost composite page', () => {
  it('renders the page title and period controls slot', () => {
    render(<Cost {...buildProps()} />)

    expect(screen.getByRole('heading', { level: 1, name: 'Cost Summary' })).toBeInTheDocument()
    expect(screen.getByTestId('period-controls')).toBeInTheDocument()
  })

  it('renders the setCostAction slot inside the header when provided', () => {
    render(
      <Cost
        {...buildProps({
          setCostAction: (
            <button type="button" data-testid="set-cost-action">
              Set Monthly Cost
            </button>
          ),
        })}
      />,
    )

    expect(screen.getByTestId('set-cost-action')).toBeInTheDocument()
  })

  it('hides the action area when no setCostAction is supplied', () => {
    render(<Cost {...buildProps()} />)

    expect(screen.queryByTestId('set-cost-action')).not.toBeInTheDocument()
  })

  it('surfaces an error banner when the query reports an error', () => {
    render(<Cost {...buildProps({ error: new Error('boom') })} />)

    expect(screen.getByRole('alert')).toHaveTextContent(/error loading cost data/i)
  })

  it('renders the metric tiles when metrics are present', () => {
    render(<Cost {...buildProps()} />)

    expect(screen.getByText('All-in Cost')).toBeInTheDocument()
    expect(screen.getByText('Energy Cost')).toBeInTheDocument()
    expect(screen.getByText('Operations Cost')).toBeInTheDocument()
  })

  it('skips metric tiles when metrics is null', () => {
    render(<Cost {...buildProps({ metrics: null })} />)

    expect(screen.queryByText('All-in Cost')).not.toBeInTheDocument()
  })
})
