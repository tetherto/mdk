import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { BitdeerTankTempCharts } from '../bitdeer-tank-temp-charts'

vi.mock('@/components/domain/container-charts-builder', () => ({
  default: vi.fn(({ chartTitle, tag, chartDataPayload }) => (
    <div data-testid="container-charts-builder">
      <div data-testid="chart-title">{chartTitle}</div>
      <div data-testid="chart-tag">{tag}</div>
      <div data-testid="chart-lines">{chartDataPayload?.lines?.length}</div>
    </div>
  )),
}))

vi.mock('@/constants/charts', () => ({
  CHART_TITLES: {
    TANK_OIL_TEMP: 'Tank TANK_NUMBER Oil Temperature',
  },
}))

const mockData = [
  {
    ts: 1000000,
    container_specific_stats_group_aggr: {
      container1: {
        cold_temp_c_1_group: 25,
        hot_temp_c_1_group: 45,
        cold_temp_c_w_1_group: 20,
        hot_temp_c_w_1_group: 40,
      },
    },
  },
]

describe('bitdeerTankTempCharts', () => {
  it('renders without crashing', () => {
    const { container } = render(<BitdeerTankTempCharts />)
    expect(container).toBeInTheDocument()
  })

  it('renders ContainerChartsBuilder', () => {
    const { getByTestId } = render(<BitdeerTankTempCharts />)
    expect(getByTestId('container-charts-builder')).toBeInTheDocument()
  })

  it('uses default tankNumber 1', () => {
    const { getByTestId } = render(<BitdeerTankTempCharts />)
    expect(getByTestId('chart-title')).toHaveTextContent('Tank 1 Oil Temperature')
  })

  it('replaces TANK_NUMBER in title', () => {
    const { getByTestId } = render(<BitdeerTankTempCharts tankNumber={2} />)
    expect(getByTestId('chart-title')).toHaveTextContent('Tank 2 Oil Temperature')
  })

  it('handles string tankNumber', () => {
    const { getByTestId } = render(<BitdeerTankTempCharts tankNumber="3" />)
    expect(getByTestId('chart-title')).toHaveTextContent('Tank 3 Oil Temperature')
  })

  it('creates 4 chart lines', () => {
    const { getByTestId } = render(<BitdeerTankTempCharts tankNumber={1} />)
    expect(getByTestId('chart-lines')).toHaveTextContent('4')
  })

  it('updates when tankNumber changes', () => {
    const { rerender, getByTestId } = render(<BitdeerTankTempCharts tankNumber={1} />)
    expect(getByTestId('chart-title')).toHaveTextContent('Tank 1 Oil Temperature')

    rerender(<BitdeerTankTempCharts tankNumber={2} />)
    expect(getByTestId('chart-title')).toHaveTextContent('Tank 2 Oil Temperature')
  })

  it('passes all props', () => {
    const { getByTestId } = render(
      <BitdeerTankTempCharts
        tag="container1"
        tankNumber={2}
        dateRange={{ start: 1000000, end: 2000000 }}
        data={mockData}
        timeline="1h"
        fixedTimezone="UTC"
        height={400}
      />,
    )
    expect(getByTestId('chart-title')).toHaveTextContent('Tank 2 Oil Temperature')
    expect(getByTestId('chart-tag')).toHaveTextContent('container1')
  })
})
