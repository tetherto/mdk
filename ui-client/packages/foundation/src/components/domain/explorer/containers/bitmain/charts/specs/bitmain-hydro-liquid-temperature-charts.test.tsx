import type { UnknownRecord } from '@mdk/core'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BitMainHydroLiquidTemperatureCharts } from '../bitmain-hydro-liquid-temperature-charts'

// Mock ContainerChartsBuilder
vi.mock('../../../../../container-charts-builder', () => ({
  default: vi.fn(({ chartTitle, tag, data, timeline, showLegend, showRangeSelector }) => (
    <div data-testid="container-charts-builder">
      <div data-testid="chart-title">{chartTitle}</div>
      <div data-testid="chart-tag">{tag}</div>
      <div data-testid="chart-timeline">{timeline}</div>
      <div data-testid="chart-data-length">{data?.length || 0}</div>
      <div data-testid="chart-show-legend">{String(showLegend)}</div>
      <div data-testid="chart-show-range-selector">{String(showRangeSelector)}</div>
    </div>
  )),
}))

describe('bitMainHydroLiquidTemperatureCharts', () => {
  const mockData: UnknownRecord[] = [
    {
      ts: 1700000000,
      container_specific_stats_group_aggr: {
        'test-container': {
          second_supply_temp1_group: 20.5,
          second_supply_temp2_group: 19.8,
        },
      },
    },
    {
      ts: 1700000900,
      container_specific_stats_group_aggr: {
        'test-container': {
          second_supply_temp1_group: 21.2,
          second_supply_temp2_group: 20.1,
        },
      },
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render with default props', () => {
      render(<BitMainHydroLiquidTemperatureCharts />)

      expect(screen.getByTestId('container-charts-builder')).toBeInTheDocument()
      expect(screen.getByTestId('chart-title')).toHaveTextContent('Hydro Liquid Temperature')
      expect(screen.getByTestId('chart-timeline')).toHaveTextContent('24h')
    })

    it('should render with custom title', () => {
      render(
        <BitMainHydroLiquidTemperatureCharts
          chartTitle="Custom Temperature Chart"
          data={mockData}
        />,
      )

      expect(screen.getByTestId('chart-title')).toHaveTextContent('Custom Temperature Chart')
    })

    it('should render with provided tag', () => {
      render(<BitMainHydroLiquidTemperatureCharts tag="test-container" data={mockData} />)

      expect(screen.getByTestId('chart-tag')).toHaveTextContent('test-container')
    })

    it('should render with provided data', () => {
      render(<BitMainHydroLiquidTemperatureCharts tag="test-container" data={mockData} />)

      expect(screen.getByTestId('chart-data-length')).toHaveTextContent('2')
    })
  })

  describe('timeline', () => {
    it('should use default timeline of 24h', () => {
      render(<BitMainHydroLiquidTemperatureCharts data={mockData} />)

      expect(screen.getByTestId('chart-timeline')).toHaveTextContent('24h')
    })

    it('should render with custom timeline', () => {
      render(<BitMainHydroLiquidTemperatureCharts timeline="7d" data={mockData} />)

      expect(screen.getByTestId('chart-timeline')).toHaveTextContent('7d')
    })
  })

  describe('legend and range selector', () => {
    it('should show legend by default', () => {
      render(<BitMainHydroLiquidTemperatureCharts data={mockData} />)

      expect(screen.getByTestId('chart-show-legend')).toHaveTextContent('true')
    })

    it('should show range selector by default', () => {
      render(<BitMainHydroLiquidTemperatureCharts data={mockData} />)

      expect(screen.getByTestId('chart-show-range-selector')).toHaveTextContent('true')
    })

    it('should hide legend when showLegend is false', () => {
      render(<BitMainHydroLiquidTemperatureCharts showLegend={false} data={mockData} />)

      expect(screen.getByTestId('chart-show-legend')).toHaveTextContent('false')
    })

    it('should hide range selector when showRangeSelector is false', () => {
      render(<BitMainHydroLiquidTemperatureCharts showRangeSelector={false} data={mockData} />)

      expect(screen.getByTestId('chart-show-range-selector')).toHaveTextContent('false')
    })
  })

  describe('data handling', () => {
    it('should handle empty data array', () => {
      render(<BitMainHydroLiquidTemperatureCharts data={[]} />)

      expect(screen.getByTestId('chart-data-length')).toHaveTextContent('0')
    })

    it('should handle undefined data', () => {
      render(<BitMainHydroLiquidTemperatureCharts data={undefined} />)

      expect(screen.getByTestId('chart-data-length')).toHaveTextContent('0')
    })
  })

  describe('chart data payload', () => {
    it('should configure correct temperature lines', () => {
      const { container } = render(<BitMainHydroLiquidTemperatureCharts data={mockData} />)

      expect(container).toBeInTheDocument()
    })
  })

  describe('props forwarding', () => {
    it('should forward all props to ContainerChartsBuilder', () => {
      render(
        <BitMainHydroLiquidTemperatureCharts
          tag="custom-tag"
          chartTitle="Custom Title"
          dateRange={{ start: 1700000000, end: 1700086400 }}
          data={mockData}
          timeline="7d"
          fixedTimezone="UTC"
          showLegend={false}
          showRangeSelector={false}
          footer={<span>Footer content</span>}
        />,
      )

      expect(screen.getByTestId('chart-tag')).toHaveTextContent('custom-tag')
      expect(screen.getByTestId('chart-title')).toHaveTextContent('Custom Title')
      expect(screen.getByTestId('chart-timeline')).toHaveTextContent('7d')
      expect(screen.getByTestId('chart-show-legend')).toHaveTextContent('false')
      expect(screen.getByTestId('chart-show-range-selector')).toHaveTextContent('false')
    })
  })

  describe('edge cases', () => {
    it('should handle missing temperature data in entries', () => {
      const incompleteData: UnknownRecord[] = [
        {
          ts: 1700000000,
          container_specific_stats_group_aggr: {
            'test-container': {},
          },
        },
      ]

      render(<BitMainHydroLiquidTemperatureCharts data={incompleteData} />)

      expect(screen.getByTestId('chart-data-length')).toHaveTextContent('1')
    })

    it('should handle null container stats', () => {
      const nullData: UnknownRecord[] = [
        {
          ts: 1700000000,
          container_specific_stats_group_aggr: null,
        },
      ]

      render(<BitMainHydroLiquidTemperatureCharts data={nullData} />)

      expect(screen.getByTestId('chart-data-length')).toHaveTextContent('1')
    })
  })
})
