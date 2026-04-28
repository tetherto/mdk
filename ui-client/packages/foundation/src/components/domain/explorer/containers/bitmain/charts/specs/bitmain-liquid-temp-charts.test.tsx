import type { UnknownRecord } from '@tetherto/mdk-core-ui'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BitMainLiquidTempCharts } from '../bitmain-liquid-temp-charts'

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

describe('bitMainLiquidTempCharts', () => {
  const mockData: UnknownRecord[] = [
    {
      ts: 1700000000,
      container_specific_stats_group_aggr: {
        'test-container': {
          supply_liquid_temp_group: 22.5,
          return_liquid_temp_group: 25.3,
        },
      },
    },
    {
      ts: 1700000900,
      container_specific_stats_group_aggr: {
        'test-container': {
          supply_liquid_temp_group: 23.1,
          return_liquid_temp_group: 26.0,
        },
      },
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render with default props', () => {
      render(<BitMainLiquidTempCharts />)

      expect(screen.getByTestId('container-charts-builder')).toBeInTheDocument()
      expect(screen.getByTestId('chart-title')).toHaveTextContent('Liquid Temperature')
      expect(screen.getByTestId('chart-timeline')).toHaveTextContent('24h')
    })

    it('should render with custom title', () => {
      render(<BitMainLiquidTempCharts chartTitle="Custom Temp Chart" data={mockData} />)

      expect(screen.getByTestId('chart-title')).toHaveTextContent('Custom Temp Chart')
    })

    it('should render with provided tag and data', () => {
      render(<BitMainLiquidTempCharts tag="test-container" data={mockData} />)

      expect(screen.getByTestId('chart-tag')).toHaveTextContent('test-container')
      expect(screen.getByTestId('chart-data-length')).toHaveTextContent('2')
    })
  })

  describe('timeline', () => {
    it('should use default timeline of 24h', () => {
      render(<BitMainLiquidTempCharts data={mockData} />)

      expect(screen.getByTestId('chart-timeline')).toHaveTextContent('24h')
    })

    it('should render with custom timeline', () => {
      render(<BitMainLiquidTempCharts timeline="7d" data={mockData} />)

      expect(screen.getByTestId('chart-timeline')).toHaveTextContent('7d')
    })
  })

  describe('legend and range selector', () => {
    it('should show legend by default', () => {
      render(<BitMainLiquidTempCharts data={mockData} />)

      expect(screen.getByTestId('chart-show-legend')).toHaveTextContent('true')
    })

    it('should show range selector by default', () => {
      render(<BitMainLiquidTempCharts data={mockData} />)

      expect(screen.getByTestId('chart-show-range-selector')).toHaveTextContent('true')
    })

    it('should hide legend when showLegend is false', () => {
      render(<BitMainLiquidTempCharts showLegend={false} data={mockData} />)

      expect(screen.getByTestId('chart-show-legend')).toHaveTextContent('false')
    })

    it('should hide range selector when showRangeSelector is false', () => {
      render(<BitMainLiquidTempCharts showRangeSelector={false} data={mockData} />)

      expect(screen.getByTestId('chart-show-range-selector')).toHaveTextContent('false')
    })
  })

  describe('data handling', () => {
    it('should handle empty data array', () => {
      render(<BitMainLiquidTempCharts data={[]} />)

      expect(screen.getByTestId('chart-data-length')).toHaveTextContent('0')
    })

    it('should handle undefined data', () => {
      render(<BitMainLiquidTempCharts data={undefined} />)

      expect(screen.getByTestId('chart-data-length')).toHaveTextContent('0')
    })
  })

  describe('props forwarding', () => {
    it('should forward all props to ContainerChartsBuilder', () => {
      render(
        <BitMainLiquidTempCharts
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

      render(<BitMainLiquidTempCharts data={incompleteData} />)

      expect(screen.getByTestId('chart-data-length')).toHaveTextContent('1')
    })

    it('should handle null container stats', () => {
      const nullData: UnknownRecord[] = [
        {
          ts: 1700000000,
          container_specific_stats_group_aggr: null,
        },
      ]

      render(<BitMainLiquidTempCharts data={nullData} />)

      expect(screen.getByTestId('chart-data-length')).toHaveTextContent('1')
    })
  })
})
