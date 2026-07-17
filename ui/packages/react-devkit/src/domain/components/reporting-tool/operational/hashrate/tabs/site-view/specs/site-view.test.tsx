import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { HashrateGroupedLog } from '../../../hashrate.types'
import { HashrateSiteView } from '../site-view'

vi.mock('@primitives', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@primitives')>()
  return {
    ...actual,
    LineChart: () => <div data-testid="line-chart" />,
    ChartContainer: ({
      children,
      loading,
      empty,
    }: {
      children: React.ReactNode
      loading?: boolean
      empty?: boolean
    }) => (
      <div data-testid="chart-container" data-loading={String(loading)} data-empty={String(empty)}>
        {!loading && !empty && children}
      </div>
    ),
    DateRangePicker: ({
      onSelect,
    }: {
      onSelect: (r: { from: Date; to: Date } | undefined) => void
    }) => (
      <button
        type="button"
        data-testid="date-range-picker"
        onClick={() =>
          onSelect({ from: new Date('2026-05-19T00:00:00Z'), to: new Date('2026-05-25T23:59:59Z') })
        }
      >
        date picker
      </button>
    ),
    MultiSelect: ({ placeholder }: { placeholder: string }) => (
      <div data-testid="multi-select">{placeholder}</div>
    ),
  }
})

const log: HashrateGroupedLog = [
  {
    ts: new Date('2026-05-19T12:00:00Z').getTime(),
    hashrateMhs: { '17': 60_000_000_000 },
  },
  {
    ts: new Date('2026-05-20T12:00:00Z').getTime(),
    hashrateMhs: { '17': 61_500_000_000 },
  },
]

describe('HashrateSiteView', () => {
  it('renders the controls row with miner-type filter and date picker', () => {
    render(<HashrateSiteView log={log} />)

    expect(screen.getByTestId('multi-select')).toHaveTextContent('Miner Type')
    expect(screen.getByTestId('date-range-picker')).toBeInTheDocument()
  })

  it('omits the Reset button when no onReset handler is provided', () => {
    render(<HashrateSiteView log={log} />)
    expect(screen.queryByRole('button', { name: /reset/i })).not.toBeInTheDocument()
  })

  it('renders the Reset button when onReset is provided and calls it on click', () => {
    const onReset = vi.fn()
    render(<HashrateSiteView log={log} onReset={onReset} />)

    fireEvent.click(screen.getByRole('button', { name: /reset/i }))
    expect(onReset).toHaveBeenCalledOnce()
  })

  it('shows the chart-container in loading state when isLoading is true', () => {
    render(<HashrateSiteView log={log} isLoading />)
    expect(screen.getByTestId('chart-container')).toHaveAttribute('data-loading', 'true')
  })

  it('reports empty when there are no log entries', () => {
    render(<HashrateSiteView log={[]} />)
    expect(screen.getByTestId('chart-container')).toHaveAttribute('data-empty', 'true')
  })

  it('renders the line chart once data is present and not loading', () => {
    render(<HashrateSiteView log={log} />)
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
  })

  it('passes the parsed date range to onDateRangeChange when the picker selects a range', () => {
    const onDateRangeChange = vi.fn()
    render(<HashrateSiteView log={log} onDateRangeChange={onDateRangeChange} />)

    fireEvent.click(screen.getByTestId('date-range-picker'))

    expect(onDateRangeChange).toHaveBeenCalledOnce()
    const arg = onDateRangeChange.mock.calls[0]?.[0]
    expect(arg.start).toBeLessThan(arg.end)
  })

  it('does not throw when DateRangePicker fires without an onDateRangeChange handler', () => {
    render(<HashrateSiteView log={log} />)
    expect(() => fireEvent.click(screen.getByTestId('date-range-picker'))).not.toThrow()
  })

  it('reflects an externally controlled dateRange in the picker without errors', () => {
    render(
      <HashrateSiteView
        log={log}
        dateRange={{ start: Date.UTC(2026, 4, 19), end: Date.UTC(2026, 4, 25, 23, 59, 59) }}
      />,
    )
    expect(screen.getByTestId('date-range-picker')).toBeInTheDocument()
  })
})
