import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SingleStatCard } from '../single-stat-card'

vi.mock('@tetherto/core', () => ({
  cn: vi.fn((...args) => args.filter(Boolean).join(' ')),
  SimpleTooltip: vi.fn(({ content, children }) => (
    <div data-testid="tooltip" content={content}>
      {children}
    </div>
  )),
  formatValueUnit: vi.fn((value, unit) => `${value}${unit}`),
}))

describe('SingleStatCard', () => {
  it('renders name and value', () => {
    render(<SingleStatCard name="Temperature" value={42} />)

    expect(screen.getByText('Temperature')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('renders with unit formatting', () => {
    render(<SingleStatCard name="Temp" value={42} unit="°C" />)

    expect(screen.getByText('42°C')).toBeInTheDocument()
  })

  it('renders subtitle', () => {
    render(<SingleStatCard name="Temp" subtitle="Inlet" value={42} unit="°C" />)

    expect(screen.getByText('Inlet')).toBeInTheDocument()
  })

  it('renders without tooltip when value is null', () => {
    render(<SingleStatCard name="Temp" value={null} />)

    expect(screen.queryByTestId('tooltip')).not.toBeInTheDocument()
  })

  it('renders with tooltip when value exists', () => {
    render(<SingleStatCard name="Temp" value={42} unit="°C" />)

    expect(screen.getByTestId('tooltip')).toHaveAttribute('content', 'Temp: 42°C')
  })

  it('includes subtitle in tooltip', () => {
    render(<SingleStatCard name="Temp" subtitle="Inlet" value={42} unit="°C" />)

    expect(screen.getByTestId('tooltip')).toHaveAttribute('content', 'Temp (Inlet): 42°C')
  })

  it('uses custom tooltip text', () => {
    render(<SingleStatCard name="Temp" value={42} unit="°C" tooltipText="Custom Tooltip" />)

    expect(screen.getByTestId('tooltip')).toHaveAttribute('content', 'Custom Tooltip: 42°C')
  })

  it('applies primary variant class', () => {
    const { container } = render(<SingleStatCard name="Test" value={123} variant="primary" />)

    expect(container.querySelector('.mdk-single-stat-card--primary')).toBeInTheDocument()
  })

  it('applies secondary variant class', () => {
    const { container } = render(<SingleStatCard name="Test" value={123} variant="secondary" />)

    expect(container.querySelector('.mdk-single-stat-card--secondary')).toBeInTheDocument()
  })

  it('applies tertiary variant class', () => {
    const { container } = render(<SingleStatCard name="Test" value={123} variant="tertiary" />)

    expect(container.querySelector('.mdk-single-stat-card--tertiary')).toBeInTheDocument()
  })

  it('applies row class', () => {
    const { container } = render(<SingleStatCard name="Test" value={123} row />)

    expect(container.querySelector('.mdk-single-stat-card--row')).toBeInTheDocument()
  })

  it('applies flash class', () => {
    const { container } = render(<SingleStatCard name="Test" value={123} flash />)

    expect(container.querySelector('.mdk-single-stat-card--flash')).toBeInTheDocument()
  })

  it('applies superflash class', () => {
    const { container } = render(<SingleStatCard name="Test" value={123} superflash />)

    expect(container.querySelector('.mdk-single-stat-card--superflash')).toBeInTheDocument()
  })

  it('applies long value class for long values', () => {
    const { container } = render(<SingleStatCard name="Test" value="1234567" />)

    expect(container.querySelector('.mdk-single-stat-card--long-value')).toBeInTheDocument()
  })

  it('does not apply long value class for short values', () => {
    const { container } = render(<SingleStatCard name="Test" value="123" />)

    expect(container.querySelector('.mdk-single-stat-card--long-value')).not.toBeInTheDocument()
  })

  it('sets custom color as CSS variable', () => {
    const { container } = render(<SingleStatCard name="Test" value={123} color="red" />)

    const card = container.querySelector('.mdk-single-stat-card')
    expect(card).toHaveStyle({ '--stat-color': 'red' })
  })

  it('handles string values', () => {
    render(<SingleStatCard name="Status" value="Active" />)

    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('handles numeric values', () => {
    render(<SingleStatCard name="Count" value={999} />)

    expect(screen.getByText('999')).toBeInTheDocument()
  })

  it('handles zero value', () => {
    render(<SingleStatCard name="Errors" value={0} />)

    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('handles undefined value', () => {
    render(<SingleStatCard name="Test" value={undefined} />)

    expect(screen.queryByTestId('tooltip')).not.toBeInTheDocument()
  })
})
