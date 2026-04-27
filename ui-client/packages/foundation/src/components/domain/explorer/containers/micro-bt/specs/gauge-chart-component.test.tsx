import { GaugeChart } from '@mdk/core'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GaugeChartComponent } from '../gauge-chart/gauge-chart-component'

vi.mock('@mdk/core', () => ({
  GaugeChart: vi.fn(({ percent }) => <div data-testid="gauge" data-percent={percent} />),
  COLOR: { EMERALD: '#00FF00', SOFT_TEAL: '#00FFFF' },
}))

describe('GaugeChartComponent', () => {
  it('renders gauge chart', () => {
    render(<GaugeChartComponent max={100} value={75} unit="%" />)
    expect(screen.getByTestId('gauge')).toBeInTheDocument()
  })

  it('displays label and value', () => {
    render(<GaugeChartComponent max={100} value={75.5} label="CPU" unit="%" />)
    expect(screen.getByText('CPU')).toBeInTheDocument()
    expect(screen.getByText('75.5')).toBeInTheDocument()
    expect(screen.getByText('%')).toBeInTheDocument()
  })

  it('calculates percentage correctly', () => {
    render(<GaugeChartComponent max={100} value={75} unit="%" />)
    expect(GaugeChart).toHaveBeenCalledWith(
      expect.objectContaining({ percent: 0.75 }),
      expect.anything(),
    )
  })

  it('clamps percentage 0-1', () => {
    const { rerender } = render(<GaugeChartComponent max={100} value={150} unit="%" />)
    expect(GaugeChart).toHaveBeenCalledWith(
      expect.objectContaining({ percent: 1 }),
      expect.anything(),
    )

    rerender(<GaugeChartComponent max={100} value={-50} unit="%" />)
    expect(GaugeChart).toHaveBeenCalledWith(
      expect.objectContaining({ percent: 0 }),
      expect.anything(),
    )
  })

  it('hides value when hideText is false', () => {
    render(<GaugeChartComponent max={100} value={75} unit="%" hideText={false} />)
    expect(screen.queryByText('75')).not.toBeInTheDocument()
  })

  it('applies custom props', () => {
    const colors = ['#FF0000', '#00FF00']
    const { container } = render(
      <GaugeChartComponent
        max={100}
        value={50}
        unit="%"
        colors={colors}
        height={300}
        className="custom"
        chartStyle={{ padding: '10px' }}
      />,
    )

    expect(GaugeChart).toHaveBeenCalledWith(
      expect.objectContaining({ colors, height: 300 }),
      expect.anything(),
    )
    expect(container.querySelector('.custom')).toBeInTheDocument()
  })
})
