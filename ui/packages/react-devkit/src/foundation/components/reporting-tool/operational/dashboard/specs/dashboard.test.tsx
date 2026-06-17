import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { OperationalDashboard } from '../dashboard'

const emptyTrend = { data: { datasets: [] } }
const emptyMiners = { data: { labels: [], datasets: [] } }

const renderDashboard = () =>
  render(
    <OperationalDashboard
      hashrate={emptyTrend}
      consumption={emptyTrend}
      efficiency={emptyTrend}
      miners={emptyMiners}
      controls={<div data-testid="controls">controls</div>}
    />,
  )

describe('OperationalDashboard', () => {
  it('renders the four chart cards by title', () => {
    renderDashboard()
    expect(screen.getByText('Hashrate')).toBeInTheDocument()
    expect(screen.getByText('Power Consumption')).toBeInTheDocument()
    expect(screen.getByText('Site Efficiency')).toBeInTheDocument()
    expect(screen.getByText('Miners Status')).toBeInTheDocument()
  })

  it('renders the controls slot when provided', () => {
    renderDashboard()
    expect(screen.getByTestId('controls')).toBeInTheDocument()
  })

  it('exposes one expand toggle per chart', () => {
    renderDashboard()
    expect(screen.getAllByRole('button', { name: 'Expand chart' })).toHaveLength(4)
  })

  it('toggles a single card to expanded on click', () => {
    renderDashboard()
    const [firstExpand] = screen.getAllByRole('button', { name: 'Expand chart' })
    fireEvent.click(firstExpand)

    expect(screen.getByRole('button', { name: 'Collapse chart' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Expand chart' })).toHaveLength(3)
  })
})
