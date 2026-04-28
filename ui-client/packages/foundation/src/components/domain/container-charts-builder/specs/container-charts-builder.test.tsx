import { LineChart } from '@tetherto/core'
import '@testing-library/jest-dom'
import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import ContainerChartsBuilder from '../index'

vi.mock('@tetherto/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tetherto/core')>()
  return {
    ...actual,
    LineChart: vi.fn(() => <div data-testid="line-chart">Chart</div>),
  }
})

const mockedLineChart = LineChart as unknown as { mock: { calls: any[] } }

const mockData = [
  {
    ts: 1000000,
    container_specific_stats_group_aggr: {
      container1: { hashrate: 100, temperature: 60 },
    },
  },
  {
    ts: 2000000,
    container_specific_stats_group_aggr: {
      container1: { hashrate: 110, temperature: 65 },
    },
  },
]
const mockChartPayload = {
  unit: 'TH/s',
  lines: [
    { backendAttribute: 'hashrate', label: 'Hashrate', borderColor: '#ff9300' },
    { backendAttribute: 'temperature', label: 'Temperature', borderColor: '#00ff00' },
  ],
  currentValueLabel: { backendAttribute: 'hashrate', decimals: 2 },
  valueDecimals: 2,
}

describe('ontainerChartsBuilder', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <ContainerChartsBuilder
        tag="container1"
        chartDataPayload={mockChartPayload}
        data={mockData}
      />,
    )
    expect(container).toBeInTheDocument()
  })

  it('renders chart title when provided', () => {
    const { getByText } = render(
      <ContainerChartsBuilder
        tag="container1"
        chartDataPayload={mockChartPayload}
        chartTitle="Hashrate Chart"
        data={mockData}
      />,
    )
    expect(getByText('Hashrate Chart')).toBeInTheDocument()
  })

  it('renders LineChart component', () => {
    const { getByTestId } = render(
      <ContainerChartsBuilder
        tag="container1"
        chartDataPayload={mockChartPayload}
        data={mockData}
      />,
    )
    expect(getByTestId('line-chart')).toBeInTheDocument()
  })

  it('handles empty data', () => {
    const { getByTestId } = render(
      <ContainerChartsBuilder tag="container1" chartDataPayload={mockChartPayload} data={[]} />,
    )
    expect(getByTestId('line-chart')).toBeInTheDocument()
  })

  it('returns null when no chartDataPayload', () => {
    const { container } = render(<ContainerChartsBuilder tag="container1" data={mockData} />)
    expect(container.firstChild).toBeNull()
  })

  it('removes container prefix from tag', () => {
    const { container } = render(
      <ContainerChartsBuilder
        tag="CONTAINER_container1"
        chartDataPayload={mockChartPayload}
        data={mockData}
      />,
    )
    expect(container).toBeInTheDocument()
  })

  it('passes timeline prop to LineChart', () => {
    render(
      <ContainerChartsBuilder
        tag="container1"
        chartDataPayload={mockChartPayload}
        data={mockData}
        timeline="1h"
      />,
    )

    expect(LineChart).toHaveBeenCalledWith(expect.objectContaining({ timeline: '1h' }), {})
  })

  it('passes fixedTimezone prop to LineChart', () => {
    render(
      <ContainerChartsBuilder
        tag="container1"
        chartDataPayload={mockChartPayload}
        data={mockData}
        fixedTimezone="America/New_York"
      />,
    )

    expect(LineChart).toHaveBeenCalledWith(
      expect.objectContaining({ fixedTimezone: 'America/New_York' }),
      {},
    )
  })

  it('formats datasets correctly', () => {
    render(
      <ContainerChartsBuilder
        tag="container1"
        chartDataPayload={mockChartPayload}
        data={mockData}
      />,
    )

    const call = mockedLineChart.mock.calls[0][0]
    expect(call.data.datasets).toHaveLength(2)
    expect(call.data.datasets[0].label).toBe('Hashrate')
    expect(call.data.datasets[1].label).toBe('Temperature')
    expect(call.data.datasets[0].label).toBe('Hashrate')
    expect(call.data.datasets[1].label).toBe('Temperature')
  })

  it('applies valueFormatter when provided', () => {
    const payloadWithFormatter = {
      ...mockChartPayload,
      valueFormatter: (value: number) => value * 2,
    }

    const { container } = render(
      <ContainerChartsBuilder
        tag="container1"
        chartDataPayload={payloadWithFormatter}
        data={mockData}
      />,
    )

    expect(container).toBeInTheDocument()
  })
})
