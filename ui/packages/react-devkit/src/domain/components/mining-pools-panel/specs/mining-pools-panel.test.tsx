import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MiningPoolsPanel } from '../index'
import type { MiningPoolRow } from '../types'

const ROWS: MiningPoolRow[] = [
  {
    id: 'f2pool',
    name: 'minerpool-f2pool-shelf-0',
    revenue24hBtc: 0.0521,
    hashratePhs: 0.901,
  },
  {
    id: 'ocean',
    name: 'minerpool-ocean-shelf-0',
    revenue24hBtc: 0,
    hashratePhs: 53.63,
  },
]

describe('MiningPoolsPanel', () => {
  it('renders one row per pool with formatted revenue and hashrate', () => {
    render(<MiningPoolsPanel rows={ROWS} />)

    expect(screen.getByText('Mining Pools')).toBeInTheDocument()
    expect(screen.getByText('minerpool-f2pool-shelf-0')).toBeInTheDocument()
    expect(screen.getByText('minerpool-ocean-shelf-0')).toBeInTheDocument()
    // F2pool < 1 PH/s → renders as TH/s (901 TH/s)
    expect(screen.getByText('901 TH/s')).toBeInTheDocument()
    // Ocean ≥ 1 PH/s → renders as PH/s
    expect(screen.getByText('53.63 PH/s')).toBeInTheDocument()
    // Non-zero BTC value is rendered with 4 decimals; zero collapses to "0 BTC"
    expect(screen.getByText('0.0521 BTC')).toBeInTheDocument()
    expect(screen.getByText('0 BTC')).toBeInTheDocument()
  })

  it('invokes onShowDetails with the clicked row', () => {
    const handler = vi.fn()
    render(<MiningPoolsPanel rows={ROWS} onShowDetails={handler} />)

    const buttons = screen.getAllByRole('button', { name: 'Show details' })
    expect(buttons).toHaveLength(2)
    fireEvent.click(buttons[1]!)
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler.mock.calls[0]![0]).toMatchObject({ id: 'ocean' })
  })

  it('omits the action button when no onShowDetails handler is provided', () => {
    render(<MiningPoolsPanel rows={ROWS} />)
    expect(screen.queryByRole('button', { name: 'Show details' })).not.toBeInTheDocument()
  })

  it('renders the empty message when rows is empty', () => {
    render(<MiningPoolsPanel rows={[]} emptyMessage="Nothing here yet" />)
    expect(screen.getByText('Nothing here yet')).toBeInTheDocument()
  })
})
