import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { BitdeerTankPressureCharts } from '../bitdeer-tank-pressure-charts'

vi.mock('@/components/domain/container-charts-builder', () => ({
  default: vi.fn(({ chartTitle, tag }) => (
    <div data-testid="container-charts-builder">
      <div data-testid="chart-title">{chartTitle}</div>
      <div data-testid="chart-tag">{tag}</div>
    </div>
  )),
}))

const mockData = [
  {
    ts: 1000000,
    container_specific_stats_group_aggr: {
      container1: { tank1_bar_group: 2.5, tank2_bar_group: 2.3 },
    },
  },
]

describe('bitdeerTankPressureCharts', () => {
  it('renders without crashing', () => {
    const { container } = render(<BitdeerTankPressureCharts />)
    expect(container).toBeInTheDocument()
  })

  it('renders ContainerChartsBuilder', () => {
    const { getByTestId } = render(<BitdeerTankPressureCharts />)
    expect(getByTestId('container-charts-builder')).toBeInTheDocument()
  })

  it('passes tag prop', () => {
    const { getByTestId } = render(<BitdeerTankPressureCharts tag="container1" />)
    expect(getByTestId('chart-tag')).toHaveTextContent('container1')
  })

  it('passes chartTitle prop', () => {
    const { getByTestId } = render(<BitdeerTankPressureCharts chartTitle="Tank Pressure" />)
    expect(getByTestId('chart-title')).toHaveTextContent('Tank Pressure')
  })

  it('uses default title when not provided', () => {
    const { getByTestId } = render(<BitdeerTankPressureCharts />)
    expect(getByTestId('chart-title')).toHaveTextContent('Tank Pressure')
  })

  it('passes dateRange prop', () => {
    const dateRange = { start: 1000000, end: 2000000 }
    const { container } = render(<BitdeerTankPressureCharts dateRange={dateRange} />)
    expect(container).toBeInTheDocument()
  })

  it('passes data prop', () => {
    const { container } = render(<BitdeerTankPressureCharts data={mockData} />)
    expect(container).toBeInTheDocument()
  })

  it('passes timeline prop', () => {
    const { container } = render(<BitdeerTankPressureCharts timeline="24h" />)
    expect(container).toBeInTheDocument()
  })

  it('passes fixedTimezone prop', () => {
    const { container } = render(<BitdeerTankPressureCharts fixedTimezone="America/New_York" />)
    expect(container).toBeInTheDocument()
  })

  it('passes height prop', () => {
    const { container } = render(<BitdeerTankPressureCharts height={300} />)
    expect(container).toBeInTheDocument()
  })

  it('passes all props together', () => {
    const { getByTestId } = render(
      <BitdeerTankPressureCharts
        tag="container1"
        chartTitle="Custom Title"
        dateRange={{ start: 1000000, end: 2000000 }}
        data={mockData}
        timeline="1h"
        fixedTimezone="UTC"
        height={400}
      />,
    )
    expect(getByTestId('chart-title')).toHaveTextContent('Custom Title')
    expect(getByTestId('chart-tag')).toHaveTextContent('container1')
  })
})
