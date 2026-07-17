import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Badge } from '../index'

describe('badge', () => {
  it('renders standalone badge with count', () => {
    const { container } = render(<Badge count={5} />)
    expect(container.querySelector('.mdk-badge')).toHaveTextContent('5')
  })

  it('wraps children with badge', () => {
    render(
      <Badge count={3}>
        <button>Button</button>
      </Badge>,
    )
    expect(screen.getByRole('button')).toHaveTextContent('Button')
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('shows overflow indicator when count exceeds overflowCount', () => {
    const { container } = render(<Badge count={100} overflowCount={99} />)
    expect(container.querySelector('.mdk-badge')).toHaveTextContent('99+')
  })

  it('uses default overflowCount of 99', () => {
    const { container } = render(<Badge count={100} />)
    expect(container.querySelector('.mdk-badge')).toHaveTextContent('99+')
  })

  it('hides badge when count is 0 by default', () => {
    const { container } = render(<Badge count={0} />)
    expect(container.querySelector('.mdk-badge')).not.toBeInTheDocument()
  })

  it('shows badge when count is 0 and showZero is true', () => {
    const { container } = render(<Badge count={0} showZero />)
    expect(container.querySelector('.mdk-badge')).toHaveTextContent('0')
  })

  it('renders dot badge', () => {
    const { container } = render(<Badge dot />)
    expect(container.querySelector('.mdk-badge--dot')).toBeInTheDocument()
  })

  it('renders text content when text prop is provided', () => {
    const { container } = render(<Badge text="NEW" />)
    expect(container.querySelector('.mdk-badge')).toHaveTextContent('NEW')
  })

  it('text prop overrides count', () => {
    const { container } = render(<Badge count={5} text="HOT" />)
    expect(container.querySelector('.mdk-badge')).toHaveTextContent('HOT')
    expect(container.querySelector('.mdk-badge')).not.toHaveTextContent('5')
  })

  it('applies color variants correctly', () => {
    const { container, rerender } = render(<Badge count={1} color="primary" />)
    expect(container.querySelector('.mdk-badge')).toHaveClass('mdk-badge--primary')

    rerender(<Badge count={1} color="success" />)
    expect(container.querySelector('.mdk-badge')).toHaveClass('mdk-badge--success')

    rerender(<Badge count={1} color="error" />)
    expect(container.querySelector('.mdk-badge')).toHaveClass('mdk-badge--error')

    rerender(<Badge count={1} color="warning" />)
    expect(container.querySelector('.mdk-badge')).toHaveClass('mdk-badge--warning')
  })

  it('defaults to primary color', () => {
    const { container } = render(<Badge count={1} />)
    expect(container.querySelector('.mdk-badge')).toHaveClass('mdk-badge--primary')
  })

  it('applies size variants correctly', () => {
    const { container, rerender } = render(<Badge count={1} size="sm" />)
    expect(container.querySelector('.mdk-badge')).toHaveClass('mdk-badge--sm')

    rerender(<Badge count={1} size="md" />)
    expect(container.querySelector('.mdk-badge')).toHaveClass('mdk-badge--md')

    rerender(<Badge count={1} size="lg" />)
    expect(container.querySelector('.mdk-badge')).toHaveClass('mdk-badge--lg')
  })

  it('defaults to md size', () => {
    const { container } = render(<Badge count={1} />)
    expect(container.querySelector('.mdk-badge')).toHaveClass('mdk-badge--md')
  })

  it('applies offset transform when children and offset provided', () => {
    const { container } = render(
      <Badge count={5} offset={[10, -5]}>
        <button>Button</button>
      </Badge>,
    )
    const badge = container.querySelector('.mdk-badge')
    expect(badge).toHaveStyle({ transform: 'translate(calc(50% + 10px), calc(-50% + -5px))' })
  })

  it('does not apply offset transform for standalone badge', () => {
    const { container } = render(<Badge count={5} offset={[10, -5]} />)
    const badge = container.querySelector('.mdk-badge')
    expect(badge).not.toHaveStyle({ transform: 'translate(calc(50% + 10px), calc(-50% + -5px))' })
  })

  it('applies standalone class when no children', () => {
    const { container } = render(<Badge count={5} />)
    expect(container.querySelector('.mdk-badge')).toHaveClass('mdk-badge--standalone')
  })

  it('does not apply standalone class when children present', () => {
    const { container } = render(
      <Badge count={5}>
        <button>Button</button>
      </Badge>,
    )
    expect(container.querySelector('.mdk-badge')).not.toHaveClass('mdk-badge--standalone')
  })

  it('renders status badge', () => {
    const { container } = render(<Badge status="success" text="Online" />)
    expect(container.querySelector('.mdk-badge--status')).toBeInTheDocument()
    expect(container.querySelector('.mdk-badge--status-success')).toBeInTheDocument()
    expect(container.querySelector('.mdk-badge')).toHaveTextContent('Online')
  })

  it('renders all status variants', () => {
    const { container, rerender } = render(<Badge status="success" />)
    expect(container.querySelector('.mdk-badge--status-success')).toBeInTheDocument()

    rerender(<Badge status="processing" />)
    expect(container.querySelector('.mdk-badge--status-processing')).toBeInTheDocument()

    rerender(<Badge status="error" />)
    expect(container.querySelector('.mdk-badge--status-error')).toBeInTheDocument()

    rerender(<Badge status="warning" />)
    expect(container.querySelector('.mdk-badge--status-warning')).toBeInTheDocument()

    rerender(<Badge status="default" />)
    expect(container.querySelector('.mdk-badge--status-default')).toBeInTheDocument()
  })

  it('shows status badge even when count is 0', () => {
    const { container } = render(<Badge status="success" count={0} />)
    expect(container.querySelector('.mdk-badge')).toBeInTheDocument()
  })

  it('applies custom className to badge', () => {
    const { container } = render(<Badge count={1} className="custom-badge" />)
    expect(container.querySelector('.mdk-badge')).toHaveClass('custom-badge')
  })

  it('applies wrapperClassName when children present', () => {
    const { container } = render(
      <Badge count={1} wrapperClassName="custom-wrapper">
        <button>Button</button>
      </Badge>,
    )
    expect(container.querySelector('.mdk-badge-wrapper')).toHaveClass('custom-wrapper')
  })

  it('sets title attribute for accessibility', () => {
    const { container } = render(<Badge count={5} title="5 notifications" />)
    expect(container.querySelector('.mdk-badge')).toHaveAttribute('title', '5 notifications')
  })

  it('adds data-has-offset attribute when offset is provided with children', () => {
    const { container } = render(
      <Badge count={5} offset={[10, -5]}>
        <button>Button</button>
      </Badge>,
    )
    expect(container.querySelector('.mdk-badge-wrapper')).toHaveAttribute('data-has-offset', 'true')
  })

  it('forwards ref to wrapper when children present', () => {
    const ref = vi.fn()
    render(
      <Badge count={5} ref={ref}>
        <button>Button</button>
      </Badge>,
    )
    expect(ref).toHaveBeenCalled()
  })

  it('forwards ref to badge when standalone', () => {
    const ref = vi.fn()
    render(<Badge count={5} ref={ref} />)
    expect(ref).toHaveBeenCalled()
  })

  it('dot badge shows even with count 0', () => {
    const { container } = render(<Badge dot count={0} />)
    expect(container.querySelector('.mdk-badge')).toBeInTheDocument()
  })

  it('applies square class when square is true', () => {
    const { container } = render(<Badge count={5} square />)
    expect(container.querySelector('.mdk-badge')).toHaveClass('mdk-badge--square')
  })

  it('does not apply square class by default', () => {
    const { container } = render(<Badge count={5} />)
    expect(container.querySelector('.mdk-badge')).not.toHaveClass('mdk-badge--square')
  })

  it('applies square class to standalone badge', () => {
    const { container } = render(<Badge count={25} square />)
    expect(container.querySelector('.mdk-badge')).toHaveClass('mdk-badge--square')
  })

  it('applies square class to badge with children', () => {
    const { container } = render(
      <Badge count={5} square>
        <button>Button</button>
      </Badge>,
    )
    expect(container.querySelector('.mdk-badge')).toHaveClass('mdk-badge--square')
  })
})
