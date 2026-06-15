import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { HashrateGroupedLog } from '../../../hashrate.types'
import { HashrateMinerTypeView } from '../miner-type-view'

vi.mock('@core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@core')>()
  return {
    ...actual,
    BarChart: () => <div data-testid="bar-chart" />,
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
    hashrateMhs: { '17': 60_000_000_000, '18': 30_000_000_000 },
  },
  {
    ts: new Date('2026-05-20T12:00:00Z').getTime(),
    hashrateMhs: { '17': 61_500_000_000, '18': 31_000_000_000 },
  },
]

describe('HashrateMinerTypeView', () => {
  it('renders the section title', () => {
    render(<HashrateMinerTypeView log={log} />)
    expect(screen.getByText('Hashrate by Miner Type')).toBeInTheDocument()
  })

  it('renders the miner-type multi-select and date picker', () => {
    render(<HashrateMinerTypeView log={log} />)
    expect(screen.getByTestId('multi-select')).toHaveTextContent('Miner Type')
    expect(screen.getByTestId('date-range-picker')).toBeInTheDocument()
  })

  it('hides the Reset button when no onReset handler is provided', () => {
    render(<HashrateMinerTypeView log={log} />)
    expect(screen.queryByRole('button', { name: /reset/i })).not.toBeInTheDocument()
  })

  it('renders the Reset button and forwards clicks to onReset', () => {
    const onReset = vi.fn()
    render(<HashrateMinerTypeView log={log} onReset={onReset} />)
    fireEvent.click(screen.getByRole('button', { name: /reset/i }))
    expect(onReset).toHaveBeenCalledOnce()
  })

  it('toggles loading state on ChartContainer', () => {
    render(<HashrateMinerTypeView log={log} isLoading />)
    expect(screen.getByTestId('chart-container')).toHaveAttribute('data-loading', 'true')
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument()
  })

  it('reports empty when the log has no entries', () => {
    render(<HashrateMinerTypeView log={[]} />)
    expect(screen.getByTestId('chart-container')).toHaveAttribute('data-empty', 'true')
  })

  it('renders the bar chart when data is present', () => {
    render(<HashrateMinerTypeView log={log} />)
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })

  it('forwards date-range selections to onDateRangeChange', () => {
    const onDateRangeChange = vi.fn()
    render(<HashrateMinerTypeView log={log} onDateRangeChange={onDateRangeChange} />)
    fireEvent.click(screen.getByTestId('date-range-picker'))
    expect(onDateRangeChange).toHaveBeenCalledOnce()
  })

  it('ignores DateRangePicker clicks when no onDateRangeChange handler is wired', () => {
    render(<HashrateMinerTypeView log={log} />)
    expect(() => fireEvent.click(screen.getByTestId('date-range-picker'))).not.toThrow()
  })

  it('accepts an externally controlled dateRange without crashing', () => {
    render(
      <HashrateMinerTypeView
        log={log}
        dateRange={{ start: Date.UTC(2026, 4, 19), end: Date.UTC(2026, 4, 25, 23, 59, 59) }}
      />,
    )
    expect(screen.getByTestId('date-range-picker')).toBeInTheDocument()
  })
})
