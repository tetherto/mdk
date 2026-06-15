import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { SubsidyFeesResponse } from '@/types/finance'
import { SubsidyFee } from '../subsidy-fee'

vi.mock('@core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@core')>()
  return {
    ...actual,
    BarChart: ({ data }: any) => (
      <div data-testid="bar-chart" data-datasets={String(data.datasets.length)} />
    ),
    ChartContainer: ({ children, title, loading, empty }: any) => (
      <section
        data-testid="chart-container"
        data-loading={String(loading)}
        data-empty={String(empty)}
      >
        <h3>{title}</h3>
        {!loading && !empty && children}
      </section>
    ),
  }
})

vi.mock('@/components/reporting-tool/timeframe-controls', () => ({
  TimeframeControls: ({ onRangeChange, hint }: any) => (
    <div
      className={
        hint != null && hint !== ''
          ? 'mdk-timeframe-controls mdk-timeframe-controls--banded'
          : 'mdk-timeframe-controls'
      }
    >
      {hint != null && hint !== '' ? <p className="mdk-timeframe-controls__hint">{hint}</p> : null}
      <button
        type="button"
        onClick={() =>
          onRangeChange([new Date('2026-05-09T00:00:00Z'), new Date('2026-05-10T23:59:59Z')], {
            period: 'daily',
          })
        }
      >
        Timeframe Controls
      </button>
    </div>
  ),
}))

const makeResponse = (): SubsidyFeesResponse => {
  const now = new Date()
  const ts = new Date(
    now.getFullYear(),
    now.getMonth(),
    Math.max(1, now.getDate() - 1),
    12,
  ).getTime()

  return {
    log: [
      {
        ts,
        blockReward: 312_500_000,
        blockTotalFees: 12_500_000,
        avgFeesSatsVByte: 0.27,
      },
    ],
    summary: {
      totalBlockReward: 312_500_000,
      totalBlockTotalFees: 12_500_000,
      avgBlockReward: 312_500_000,
      avgBlockTotalFees: 12_500_000,
    },
  }
}

describe('SubsidyFee', () => {
  it('renders the two financial chart sections', () => {
    // Pin the clock to a mid-month date: the default range is the current
    // calendar month capped to end-of-yesterday, so on the 1st of a month it
    // collapses to an empty window and no charts render. A fixed mid-month
    // date keeps this test deterministic regardless of the run date.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-16T12:00:00Z'))
    try {
      render(<SubsidyFee data={makeResponse()} />)

      expect(screen.getByText('Subsidy/Fees')).toBeInTheDocument()
      expect(screen.getByText('Average Fees in Sats/vByte')).toBeInTheDocument()
      expect(screen.getAllByTestId('bar-chart')).toHaveLength(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('passes loading state to chart containers', () => {
    render(<SubsidyFee data={makeResponse()} isLoading />)

    expect(screen.getAllByTestId('chart-container')[0]).toHaveAttribute('data-loading', 'true')
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument()
  })

  it('can render optional summary cards with SingleStatCard', () => {
    render(<SubsidyFee data={makeResponse()} showSummaryCards />)

    expect(screen.getByText('Total Subsidy')).toBeInTheDocument()
    expect(screen.getByText('Total Fees')).toBeInTheDocument()
    expect(screen.getByText('Average Fees')).toBeInTheDocument()
  })

  it('passes a timeframe hint via TimeframeControls (band shell)', () => {
    render(<SubsidyFee data={makeResponse()} />)

    expect(document.querySelector('.mdk-timeframe-controls--banded')).toBeInTheDocument()
    expect(screen.getByText('Select a period in one of the timeframes')).toBeInTheDocument()
  })

  it('notifies consumers about the initial finance query params', async () => {
    const onDateRangeChange = vi.fn()
    render(<SubsidyFee data={makeResponse()} onDateRangeChange={onDateRangeChange} />)

    await waitFor(() => expect(onDateRangeChange).toHaveBeenCalledOnce())
    expect(onDateRangeChange.mock.calls[0]?.[1]).toMatchObject({ period: 'daily' })
  })

  it('shows an alert when isError is true', () => {
    render(<SubsidyFee isError errorMessage="Custom failure" />)

    expect(screen.getByRole('alert')).toHaveTextContent('Custom failure')
  })

  it('renders empty chart containers when no data or log is passed', () => {
    render(<SubsidyFee />)

    const containers = screen.getAllByTestId('chart-container')
    expect(containers.every((c) => c.getAttribute('data-empty') === 'true')).toBe(true)
  })

  it('accepts log rows without a data wrapper', () => {
    const log = makeResponse().log
    render(<SubsidyFee log={log} />)

    expect(screen.getByText('Subsidy/Fees')).toBeInTheDocument()
  })

  it('fires onDateRangeChange again when the timeframe selection updates', async () => {
    const onDateRangeChange = vi.fn()
    render(<SubsidyFee data={makeResponse()} onDateRangeChange={onDateRangeChange} />)

    await waitFor(() => expect(onDateRangeChange).toHaveBeenCalled())
    const initialCalls = onDateRangeChange.mock.calls.length

    fireEvent.click(screen.getByRole('button', { name: 'Timeframe Controls' }))

    await waitFor(() => expect(onDateRangeChange.mock.calls.length).toBeGreaterThan(initialCalls))
  })
})
