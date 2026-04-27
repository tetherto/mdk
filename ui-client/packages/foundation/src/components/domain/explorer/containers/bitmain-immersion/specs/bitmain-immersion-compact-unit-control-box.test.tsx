import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BitMainImmersionCompactUnitControlBox } from '../unit-control-box/bitmain-immersion-compact-unit-control-box'

vi.mock('../control-box/bitmain-immersion-control-box', () => ({
  BitMainImmersionControlBox: vi.fn(({ title, rightContent, secondary, className }) => (
    <div data-testid="control-box" data-secondary={secondary} className={className}>
      {title && <div>{title}</div>}
      {rightContent}
    </div>
  )),
}))

describe('BitMainImmersionCompactUnitControlBox', () => {
  it('renders without crashing', () => {
    render(<BitMainImmersionCompactUnitControlBox />)
    expect(screen.getByTestId('control-box')).toBeInTheDocument()
  })

  it('renders title', () => {
    render(<BitMainImmersionCompactUnitControlBox title="Valve Control" />)
    expect(screen.getByText('Valve Control')).toBeInTheDocument()
  })

  it('shows Open when isOpen is true', () => {
    render(<BitMainImmersionCompactUnitControlBox isOpen={true} />)
    expect(screen.getByText('Open')).toBeInTheDocument()
  })

  it('shows Closed when isOpen is false', () => {
    render(<BitMainImmersionCompactUnitControlBox isOpen={false} />)
    expect(screen.getByText('Closed')).toBeInTheDocument()
  })

  it('shows Opening when opening is true', () => {
    render(<BitMainImmersionCompactUnitControlBox opening={true} />)
    expect(screen.getByText('Opening')).toBeInTheDocument()
  })

  it('shows Closing when closing is true', () => {
    render(<BitMainImmersionCompactUnitControlBox closing={true} />)
    expect(screen.getByText('Closing')).toBeInTheDocument()
  })

  it('does not show Opening when opening is false', () => {
    render(<BitMainImmersionCompactUnitControlBox opening={false} />)
    expect(screen.queryByText('Opening')).not.toBeInTheDocument()
  })

  it('does not show Closing when closing is false', () => {
    render(<BitMainImmersionCompactUnitControlBox closing={false} />)
    expect(screen.queryByText('Closing')).not.toBeInTheDocument()
  })

  it('applies open class when isOpen is true', () => {
    const { container } = render(<BitMainImmersionCompactUnitControlBox isOpen={true} />)
    expect(
      container.querySelector('.mdk-bitmain-immersion-compact-unit-control-box__primary--open'),
    ).toBeInTheDocument()
  })

  it('applies closed class when isOpen is false', () => {
    const { container } = render(<BitMainImmersionCompactUnitControlBox isOpen={false} />)
    expect(
      container.querySelector('.mdk-bitmain-immersion-compact-unit-control-box__primary--closed'),
    ).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<BitMainImmersionCompactUnitControlBox className="custom-class" />)
    expect(container.querySelector('.custom-class')).toBeInTheDocument()
  })

  it('sets secondary prop to true on control box', () => {
    render(<BitMainImmersionCompactUnitControlBox />)
    expect(screen.getByTestId('control-box')).toHaveAttribute('data-secondary', 'true')
  })

  it('shows both Open and Opening states', () => {
    render(<BitMainImmersionCompactUnitControlBox isOpen={true} opening={true} />)
    expect(screen.getByText('Open')).toBeInTheDocument()
    expect(screen.getByText('Opening')).toBeInTheDocument()
  })

  it('shows both Closed and Closing states', () => {
    render(<BitMainImmersionCompactUnitControlBox isOpen={false} closing={true} />)
    expect(screen.getByText('Closed')).toBeInTheDocument()
    expect(screen.getByText('Closing')).toBeInTheDocument()
  })

  it('has correct wrapper class', () => {
    const { container } = render(<BitMainImmersionCompactUnitControlBox />)
    expect(
      container.querySelector('.mdk-bitmain-immersion-compact-unit-control-box'),
    ).toBeInTheDocument()
  })
})
