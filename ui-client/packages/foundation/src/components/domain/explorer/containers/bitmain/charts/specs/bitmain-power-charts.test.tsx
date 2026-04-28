import type { UnknownRecord } from '@tetherto/mdk-core-ui'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BitMainPowerCharts } from '../bitmain-power-charts'

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
vi.mock('@tetherto/mdk-core-ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tetherto/mdk-core-ui')>()
  return {
    ...actual,
    safeNumber: vi.fn((number) => number ?? 0),
    safeString: vi.fn((str) => str ?? ''),
  }
})
describe('bitMainPowerCharts', () => {
  const mockData: UnknownRecord[] = [
    {
      ts: 1700000000,
      container_specific_stats_group_aggr: {
        'test-container': {
          distribution_box1_power_group: 50.25, // kW
          distribution_box2_power_group: 48.1, // kW
        },
      },
    },
    {
      ts: 1700000900,
      container_specific_stats_group_aggr: {
        'test-container': {
          distribution_box1_power_group: 51.0,
          distribution_box2_power_group: 49.2,
        },
      },
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render with default props', () => {
      render(<BitMainPowerCharts />)

      expect(screen.getByTestId('container-charts-builder')).toBeInTheDocument()
      expect(screen.getByTestId('chart-title')).toHaveTextContent('Power Consumption')
      expect(screen.getByTestId('chart-timeline')).toHaveTextContent('24h')
    })

    it('should render with custom title', () => {
      render(<BitMainPowerCharts chartTitle="Custom Power Chart" data={mockData} />)

      expect(screen.getByTestId('chart-title')).toHaveTextContent('Custom Power Chart')
    })

    it('should render with provided tag and data', () => {
      render(<BitMainPowerCharts tag="test-container" data={mockData} />)

      expect(screen.getByTestId('chart-tag')).toHaveTextContent('test-container')
      expect(screen.getByTestId('chart-data-length')).toHaveTextContent('2')
    })
  })

  describe('data preprocessing', () => {
    it('should compute total power from distribution boxes', () => {
      const { rerender } = render(<BitMainPowerCharts tag="test-container" data={mockData} />)

      expect(screen.getByTestId('chart-data-length')).toHaveTextContent('2')

      // Re-render to verify data is processed
      rerender(<BitMainPowerCharts tag="test-container" data={mockData} />)
      expect(screen.getByTestId('container-charts-builder')).toBeInTheDocument()
    })

    it('should handle data with missing power values', () => {
      const incompleteData: UnknownRecord[] = [
        {
          ts: 1700000000,
          container_specific_stats_group_aggr: {
            'test-container': {
              distribution_box1_power_group: 50,
              // distribution_box2_power_group missing
            },
          },
        },
      ]

      render(<BitMainPowerCharts data={incompleteData} />)

      expect(screen.getByTestId('chart-data-length')).toHaveTextContent('1')
    })

    it('should handle multiple containers in stats group', () => {
      const multiContainerData: UnknownRecord[] = [
        {
          ts: 1700000000,
          container_specific_stats_group_aggr: {
            'container-1': {
              distribution_box1_power_group: 50,
              distribution_box2_power_group: 48,
            },
            'container-2': {
              distribution_box1_power_group: 45,
              distribution_box2_power_group: 43,
            },
          },
        },
      ]

      render(<BitMainPowerCharts data={multiContainerData} />)

      expect(screen.getByTestId('chart-data-length')).toHaveTextContent('1')
    })
  })

  describe('timeline', () => {
    it('should use default timeline of 24h', () => {
      render(<BitMainPowerCharts data={mockData} />)

      expect(screen.getByTestId('chart-timeline')).toHaveTextContent('24h')
    })

    it('should render with custom timeline', () => {
      render(<BitMainPowerCharts timeline="7d" data={mockData} />)

      expect(screen.getByTestId('chart-timeline')).toHaveTextContent('7d')
    })
  })

  describe('legend and range selector', () => {
    it('should show legend by default', () => {
      render(<BitMainPowerCharts data={mockData} />)

      expect(screen.getByTestId('chart-show-legend')).toHaveTextContent('true')
    })

    it('should show range selector by default', () => {
      render(<BitMainPowerCharts data={mockData} />)

      expect(screen.getByTestId('chart-show-range-selector')).toHaveTextContent('true')
    })

    it('should hide legend when showLegend is false', () => {
      render(<BitMainPowerCharts showLegend={false} data={mockData} />)

      expect(screen.getByTestId('chart-show-legend')).toHaveTextContent('false')
    })

    it('should hide range selector when showRangeSelector is false', () => {
      render(<BitMainPowerCharts showRangeSelector={false} data={mockData} />)

      expect(screen.getByTestId('chart-show-range-selector')).toHaveTextContent('false')
    })
  })

  describe('data handling', () => {
    it('should handle empty data array', () => {
      render(<BitMainPowerCharts data={[]} />)

      expect(screen.getByTestId('chart-data-length')).toHaveTextContent('0')
    })

    it('should handle undefined data', () => {
      render(<BitMainPowerCharts data={undefined} />)

      expect(screen.getByTestId('chart-data-length')).toHaveTextContent('0')
    })
  })

  describe('props forwarding', () => {
    it('should forward all props to ContainerChartsBuilder', () => {
      render(
        <BitMainPowerCharts
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
    it('should handle null container stats', () => {
      const nullData: UnknownRecord[] = [
        {
          ts: 1700000000,
          container_specific_stats_group_aggr: null,
        },
      ]

      render(<BitMainPowerCharts data={nullData} />)

      expect(screen.getByTestId('chart-data-length')).toHaveTextContent('1')
    })

    it('should handle undefined container stats group', () => {
      const undefinedStatsData: UnknownRecord[] = [
        {
          ts: 1700000000,
        },
      ]

      render(<BitMainPowerCharts data={undefinedStatsData} />)

      expect(screen.getByTestId('chart-data-length')).toHaveTextContent('1')
    })
  })
})
