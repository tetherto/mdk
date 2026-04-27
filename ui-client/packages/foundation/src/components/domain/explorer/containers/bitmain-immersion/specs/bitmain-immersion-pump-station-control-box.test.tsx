import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BitMainImmersionPumpStationControlBox } from '../pump-station/bitmain-immersion-pump-station-control-box'

vi.mock('@mdk/core', () => ({
  Tag: vi.fn(({ color, children }) => (
    <span data-testid="tag" data-color={color}>
      {children}
    </span>
  )),
}))

describe('BitMainImmersionPumpStationControlBox', () => {
  it('renders without crashing', () => {
    render(<BitMainImmersionPumpStationControlBox />)
    expect(
      document.querySelector('.mdk-bitmain-immersion-pump-station-control-box'),
    ).toBeInTheDocument()
  })

  it('renders title', () => {
    render(<BitMainImmersionPumpStationControlBox title="Pump Station #1" />)
    expect(screen.getByText('Pump Station #1')).toBeInTheDocument()
  })

  it('shows Normal tag when no alarm', () => {
    render(<BitMainImmersionPumpStationControlBox alarmStatus={false} />)
    expect(screen.getByText('Normal')).toBeInTheDocument()
    expect(screen.getByTestId('tag')).toHaveAttribute('data-color', 'green')
  })

  it('shows Fault tag when alarm is true', () => {
    render(<BitMainImmersionPumpStationControlBox alarmStatus={true} />)
    expect(screen.getByText('Fault')).toBeInTheDocument()
    expect(screen.getByTestId('tag')).toHaveAttribute('data-color', 'red')
  })

  it('shows Ready when ready is true', () => {
    render(<BitMainImmersionPumpStationControlBox ready={true} />)
    expect(screen.getByText('Ready')).toBeInTheDocument()
  })

  it('shows Not Ready when ready is false', () => {
    render(<BitMainImmersionPumpStationControlBox ready={false} />)
    expect(screen.getByText('Not Ready')).toBeInTheDocument()
  })

  it('shows Operating when operation is true', () => {
    render(<BitMainImmersionPumpStationControlBox operation={true} />)
    expect(screen.getByText('Operating')).toBeInTheDocument()
  })

  it('shows Not Operating when operation is false', () => {
    render(<BitMainImmersionPumpStationControlBox operation={false} />)
    expect(screen.getByText('Not Operating')).toBeInTheDocument()
  })

  it('shows Started when start is true', () => {
    render(<BitMainImmersionPumpStationControlBox start={true} />)
    expect(screen.getByText('Started')).toBeInTheDocument()
  })

  it('shows Not Started when start is false', () => {
    render(<BitMainImmersionPumpStationControlBox start={false} />)
    expect(screen.getByText('Not Started')).toBeInTheDocument()
  })

  it('does not render undefined statuses', () => {
    render(<BitMainImmersionPumpStationControlBox ready={undefined} />)
    expect(screen.queryByText(/Ready/)).not.toBeInTheDocument()
  })

  it('applies on state class when status is true', () => {
    const { container } = render(<BitMainImmersionPumpStationControlBox ready={true} />)
    expect(
      container.querySelector('.mdk-bitmain-immersion-pump-station-control-box__state--on'),
    ).toBeInTheDocument()
  })

  it('applies off state class when status is false', () => {
    const { container } = render(<BitMainImmersionPumpStationControlBox ready={false} />)
    expect(
      container.querySelector('.mdk-bitmain-immersion-pump-station-control-box__state--off'),
    ).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<BitMainImmersionPumpStationControlBox className="custom-class" />)
    expect(container.querySelector('.custom-class')).toBeInTheDocument()
  })

  it('renders all statuses together', () => {
    render(
      <BitMainImmersionPumpStationControlBox
        title="Complete"
        alarmStatus={false}
        ready={true}
        operation={true}
        start={false}
      />,
    )

    expect(screen.getByText('Complete')).toBeInTheDocument()
    expect(screen.getByText('Normal')).toBeInTheDocument()
    expect(screen.getByText('Ready')).toBeInTheDocument()
    expect(screen.getByText('Operating')).toBeInTheDocument()
    expect(screen.getByText('Not Started')).toBeInTheDocument()
  })
})
