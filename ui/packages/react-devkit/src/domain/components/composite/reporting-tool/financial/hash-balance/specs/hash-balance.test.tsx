import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { HashRevenueResponse } from '@domain/types/finance'
import { HashBalance } from '../hash-balance'

vi.mock('@primitives', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@primitives')>()
  return {
    ...actual,
    BarChart: ({ data }: { data: { datasets: unknown[] } }) => (
      <div data-testid="bar-chart" data-datasets={String(data.datasets.length)} />
    ),
    LineChart: () => <div data-testid="line-chart" />,
    ChartContainer: ({ children, header, loading, empty }: any) => (
      <section
        data-testid="chart-container"
        data-loading={String(loading)}
        data-empty={String(empty)}
      >
        {header}
        {!loading && !empty && children}
      </section>
    ),
    CurrencyToggler: ({ onChange }: { onChange: (v: string) => void }) => (
      <button type="button" onClick={() => onChange('BTC')}>
        Toggle BTC
      </button>
    ),
  }
})

vi.mock('../../../timeframe-controls', () => ({
  TimeframeControls: ({ onRangeChange, hint }: any) => (
    <div
      className={
        hint ? 'mdk-timeframe-controls mdk-timeframe-controls--banded' : 'mdk-timeframe-controls'
      }
    >
      {hint ? <p>{hint}</p> : null}
      <button
        type="button"
        onClick={() =>
          onRangeChange([new Date('2026-01-01T00:00:00Z'), new Date('2026-05-31T23:59:59Z')], {
            period: 'monthly',
          })
        }
      >
        Timeframe Controls
      </button>
    </div>
  ),
}))

const makeResponse = (): HashRevenueResponse => ({
  log: [
    {
      ts: Date.UTC(2026, 4, 15, 12),
      revenueBTC: 0.01,
      feesBTC: 0,
      revenueUSD: 100,
      feesUSD: 0,
      btcPrice: 60_000,
      hashrateMhs: 1,
      hashRevenueBTCPerPHsPerDay: 0.00001,
      hashRevenueUSDPerPHsPerDay: 0.4,
      hashCostBTCPerPHsPerDay: 0,
      hashCostUSDPerPHsPerDay: 0,
      networkHashPriceBTCPerPHsPerDay: 0.007,
      networkHashPriceUSDPerPHsPerDay: 0.01,
      networkHashrateMhs: 36_000_000_000_000,
    },
  ],
  summary: {
    avgHashRevenueBTCPerPHsPerDay: 0.00001,
    avgHashRevenueUSDPerPHsPerDay: 0.4,
    avgHashCostBTCPerPHsPerDay: 0,
    avgHashCostUSDPerPHsPerDay: 0,
    avgNetworkHashPriceBTCPerPHsPerDay: 0.007,
    avgNetworkHashPriceUSDPerPHsPerDay: 0.01,
    totalRevenueBTC: 0.01,
    totalRevenueUSD: 100,
    totalFeesBTC: 0,
    totalFeesUSD: 0,
  },
})

describe('HashBalance', () => {
  it('renders revenue tab charts and metric cards', () => {
    render(<HashBalance data={makeResponse()} />)

    expect(screen.getByText('Site Hash Revenue')).toBeInTheDocument()
    expect(screen.getByText('Avg Hash Revenue')).toBeInTheDocument()
    expect(screen.getAllByTestId('bar-chart').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
  })

  it('switches to the cost tab', async () => {
    render(<HashBalance data={makeResponse()} />)

    const costTab = screen.getByRole('tab', { name: 'Hash Cost' })
    await act(async () => {
      costTab.focus()
      fireEvent.keyDown(costTab, { key: 'Enter' })
    })

    await waitFor(() => {
      expect(screen.getByText('Avg Hash Cost')).toBeVisible()
    })
    expect(screen.getByText('Cost / Revenue / Network Hashprice')).toBeVisible()
  })

  it('notifies consumers about the initial finance query params', async () => {
    const onDateRangeChange = vi.fn()
    render(<HashBalance data={makeResponse()} onDateRangeChange={onDateRangeChange} />)

    await waitFor(() => expect(onDateRangeChange).toHaveBeenCalled())
    expect(onDateRangeChange.mock.calls[0]?.[1]).toMatchObject({ period: 'monthly' })
  })
})
