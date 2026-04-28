import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DEVICE_STATUS } from '../../../../../../constants/devices'
import { BitMainImmersionUnitControlBox } from '../unit-control-box/bitmain-immersion-unit-control-box'

vi.mock('@tetherto/mdk-core-ui', () => ({
  Tag: vi.fn(({ color, children }) => (
    <span data-testid="tag" data-color={color}>
      {children}
    </span>
  )),
  Indicator: vi.fn(({ color, children }) => (
    <div data-testid="indicator" data-color={color}>
      {children}
    </div>
  )),
  UNITS: {
    FREQUENCY_HERTZ: 'Hz',
  },
}))

vi.mock('../control-box/bitmain-immersion-control-box', () => ({
  BitMainImmersionControlBox: vi.fn(
    ({ title, leftContent, rightContent, secondary, className }) => (
      <div data-testid="control-box" data-secondary={secondary} className={className}>
        {title && <div data-testid="title">{title}</div>}
        {leftContent && <div data-testid="left-content">{leftContent}</div>}
        {rightContent && <div data-testid="right-content">{rightContent}</div>}
      </div>
    ),
  ),
}))

describe('BitMainImmersionUnitControlBox', () => {
  it('renders without crashing', () => {
    render(<BitMainImmersionUnitControlBox />)
    expect(screen.getByTestId('control-box')).toBeInTheDocument()
  })

  it('renders title', () => {
    render(<BitMainImmersionUnitControlBox title="Cooling Unit #1" />)
    expect(screen.getByTestId('title')).toHaveTextContent('Cooling Unit #1')
  })

  describe('alarm status', () => {
    it('shows Normal tag when no alarm', () => {
      render(<BitMainImmersionUnitControlBox alarmStatus={false} />)
      expect(screen.getByText('Normal')).toBeInTheDocument()
      expect(screen.getByTestId('tag')).toHaveAttribute('data-color', 'green')
    })

    it('shows Fault tag when alarm is true', () => {
      render(<BitMainImmersionUnitControlBox alarmStatus={true} />)
      expect(screen.getByText('Fault')).toBeInTheDocument()
      expect(screen.getByTestId('tag')).toHaveAttribute('data-color', 'red')
    })
  })

  describe('running status', () => {
    it('shows Running indicator when running is true', () => {
      render(<BitMainImmersionUnitControlBox running={true} />)
      expect(screen.getByText(DEVICE_STATUS.RUNNING)).toBeInTheDocument()
      expect(screen.getByTestId('indicator')).toHaveAttribute('data-color', 'green')
    })

    it('shows Off indicator when running is false', () => {
      render(<BitMainImmersionUnitControlBox running={false} />)
      expect(screen.getByText(DEVICE_STATUS.OFF)).toBeInTheDocument()
      expect(screen.getByTestId('indicator')).toHaveAttribute('data-color', 'gray')
    })
  })

  describe('frequency', () => {
    it('shows frequency when provided', () => {
      render(<BitMainImmersionUnitControlBox frequency={50} />)
      expect(screen.getByText(/50/)).toBeInTheDocument()
      expect(screen.getByText(/Hz/)).toBeInTheDocument()
    })

    it('does not show frequency when not provided', () => {
      render(<BitMainImmersionUnitControlBox />)
      expect(screen.queryByText(/Hz/)).not.toBeInTheDocument()
    })

    it('shows frequency in right column by default', () => {
      render(<BitMainImmersionUnitControlBox frequency={50} />)
      expect(screen.getByTestId('right-content')).toHaveTextContent('50')
      expect(screen.queryByTestId('left-content')).not.toBeInTheDocument()
    })

    it('shows frequency in left column when showFrequencyInLeftColumn is true', () => {
      render(<BitMainImmersionUnitControlBox frequency={60} showFrequencyInLeftColumn />)
      expect(screen.getByTestId('left-content')).toHaveTextContent('60')
    })

    it('handles zero frequency', () => {
      render(<BitMainImmersionUnitControlBox frequency={0} />)
      expect(screen.getByText(/0/)).toBeInTheDocument()
    })
  })

  describe('dry cooler mode', () => {
    it('shows Dry Cooler label when isDryCooler is true', () => {
      render(<BitMainImmersionUnitControlBox isDryCooler={true} running={true} />)
      const labels = screen.getAllByText('Dry Cooler')
      expect(labels.length).toBeGreaterThan(0)
    })

    it('uses title when isDryCooler is false', () => {
      render(<BitMainImmersionUnitControlBox title="Custom Unit" running={true} />)
      const elements = screen.getAllByText('Custom Unit')
      expect(elements.length).toBeGreaterThan(0)
    })

    it('shows Status when no title and not dry cooler', () => {
      render(<BitMainImmersionUnitControlBox running={true} />)
      expect(screen.getByText('Status')).toBeInTheDocument()
    })
  })

  describe('secondary variant', () => {
    it('applies secondary variant', () => {
      render(<BitMainImmersionUnitControlBox secondary={true} />)
      expect(screen.getByTestId('control-box')).toHaveAttribute('data-secondary', 'true')
    })

    it('does not apply secondary by default', () => {
      render(<BitMainImmersionUnitControlBox />)
      expect(screen.getByTestId('control-box')).toHaveAttribute('data-secondary', 'false')
    })
  })

  it('applies custom className', () => {
    render(<BitMainImmersionUnitControlBox className="custom-class" />)
    expect(screen.getByTestId('control-box')).toHaveClass('custom-class')
  })

  it('renders all elements together', () => {
    render(
      <BitMainImmersionUnitControlBox
        title="Complete Unit"
        alarmStatus={false}
        running={true}
        frequency={50}
      />,
    )

    const titles = screen.getAllByText('Complete Unit')
    expect(titles.length).toBeGreaterThan(0)
    expect(screen.getByText('Normal')).toBeInTheDocument()
    expect(screen.getByText(DEVICE_STATUS.RUNNING)).toBeInTheDocument()
    expect(screen.getByText(/50/)).toBeInTheDocument()
  })
})
