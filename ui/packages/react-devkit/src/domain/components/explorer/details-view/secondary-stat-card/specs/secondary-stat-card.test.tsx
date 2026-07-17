import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SecondaryStatCard } from '../secondary-stat-card'

describe('SecondaryStatCard', () => {
  it('renders with name and value', () => {
    render(<SecondaryStatCard name="Hashrate" value="95.5 TH/s" />)

    expect(screen.getByText('Hashrate')).toBeInTheDocument()
    expect(screen.getByText('95.5 TH/s')).toBeInTheDocument()
  })

  it('renders with numeric value', () => {
    render(<SecondaryStatCard name="Uptime" value={99.8} />)

    expect(screen.getByText('Uptime')).toBeInTheDocument()
    expect(screen.getByText('99.8')).toBeInTheDocument()
  })

  it('renders without value', () => {
    render(<SecondaryStatCard name="Status" />)

    expect(screen.getByText('Status')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <SecondaryStatCard name="Test" value="123" className="custom-class" />,
    )

    expect(container.querySelector('.custom-class')).toBeInTheDocument()
  })

  it('renders with correct structure', () => {
    const { container } = render(<SecondaryStatCard name="Power" value="1500W" />)

    expect(container.querySelector('.mdk-secondary-stat-card')).toBeInTheDocument()
    expect(container.querySelector('.mdk-secondary-stat-card__name')).toBeInTheDocument()
    expect(container.querySelector('.mdk-secondary-stat-card__value')).toBeInTheDocument()
  })

  it('handles long text values', () => {
    const longValue = 'This is a very long value that might need wrapping'
    render(<SecondaryStatCard name="Description" value={longValue} />)

    expect(screen.getByText(longValue)).toBeInTheDocument()
  })

  it('handles zero value', () => {
    render(<SecondaryStatCard name="Errors" value={0} />)

    expect(screen.getByText('Errors')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('handles special characters in name', () => {
    render(<SecondaryStatCard name="Temp (°C)" value="45" />)

    expect(screen.getByText('Temp (°C)')).toBeInTheDocument()
  })

  it('handles special characters in value', () => {
    render(<SecondaryStatCard name="Status" value="✓ Active" />)

    expect(screen.getByText('✓ Active')).toBeInTheDocument()
  })
})
