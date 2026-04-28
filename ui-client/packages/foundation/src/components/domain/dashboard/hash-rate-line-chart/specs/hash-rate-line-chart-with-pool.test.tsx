import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DATE_RANGE } from '../../../../../constants'
import { HashRateLineChartWithPool } from '../hash-rate-line-chart-with-pool/hash-rate-line-chart-with-pool'

import type { TimeRangeType } from '@tetherto/mdk-core-ui'
import type { HashRateDataPoint } from '../hash-rate-line-chart-utils'
import type { Dataset } from '../hash-rate-line-chart-with-pool/hash-rate-line-chart-with-pool-utils'
import {
  buildChartData,
  buildLegends,
  calculateMinMaxAvg,
  calculateTimeRange,
  filterAndDownsampleMinerPoolData,
  transformHashRateData,
} from '../hash-rate-line-chart-with-pool/hash-rate-line-chart-with-pool-utils'

vi.mock('@tetherto/mdk-core-ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tetherto/mdk-core-ui')>()
  return {
    ...actual,
    ChartContainer: ({
      title,
      loading,
      empty,
      emptyMessage,
      legendData,
      onToggleDataset,
      minMaxAvg,
      timeRange,
      rangeSelector,
      children,
    }) => (
      <div data-testid="chart-container">
        <span data-testid="chart-title">{title}</span>
        {loading && <div data-testid="chart-loading" />}
        {empty && <div data-testid="chart-empty">{emptyMessage}</div>}
        {minMaxAvg && (
          <div data-testid="min-max-avg">
            <span data-testid="min">{minMaxAvg.min}</span>
            <span data-testid="max">{minMaxAvg.max}</span>
            <span data-testid="avg">{minMaxAvg.avg}</span>
          </div>
        )}
        {timeRange && <div data-testid="time-range">{JSON.stringify(timeRange)}</div>}
        {legendData && (
          <div data-testid="legend">
            {legendData.map((item, i: number) => (
              <button
                key={item.label}
                data-testid={`legend-item-${i}`}
                onClick={() => onToggleDataset(i)}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
        {rangeSelector && (
          <div data-testid="range-selector">
            {rangeSelector.options?.map((opt) => (
              <button
                key={opt.value}
                data-testid={`range-option-${opt.value}`}
                onClick={() => rangeSelector.onChange(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
        {children}
      </div>
    ),
    LineChart: ({ data, timeline }) => (
      <div
        data-testid="line-chart"
        data-timeline={timeline}
        data-datasets={data?.datasets?.length}
      />
    ),
  }
})

vi.mock('../hash-rate-line-chart-with-pool/hash-rate-line-chart-with-pool-utils', () => ({
  buildChartData: vi.fn(() => ({ datasets: [] })),
  buildLegends: vi.fn(() => []),
  calculateAggrPoolData: vi.fn(() => []),
  calculateMinMaxAvg: vi.fn(() => ({ min: '10 TH/s', max: '120 TH/s', avg: '90 TH/s' })),
  calculateTimeRange: vi.fn(() => ({ from: 1000, to: 2000 })),
  extractUniquePoolTypes: vi.fn(() => []),
  filterAndDownsampleMinerPoolData: vi.fn(() => []),
  getHashRateTimeRange: vi.fn(() => ({ from: 1000, to: 2000 })),
  transformHashRateData: vi.fn(() => [{ time: 1000, value: 90 }]),
}))

vi.mock('../../../../../../utils/device-utils', () => ({
  getHashrateString: vi.fn((v: number) => `${v} TH/s`),
}))

vi.mock('../../../../../../utils/timeline-dropdown-data-utils', () => ({
  getTimelineRadioButtons: vi.fn(() => [
    { value: DATE_RANGE.M5, label: '5m' },
    { value: DATE_RANGE.M30, label: '30m' },
    { value: DATE_RANGE.H3, label: '3h' },
    { value: DATE_RANGE.D1, label: '1D' },
  ]),
}))

vi.mock('../../../../../../constants/charts', () => ({
  CHART_TITLES: { HASH_RATE: 'Hash Rate' },
}))

const defaultProps = {
  isOneMinEnabled: false,
  minerTailLogData: [],
  isMinerTailLogLoading: false,
  isMinerTailLogFetching: false,
  minerPoolDataRaw: [],
  isMinerpoolInitialLoading: false,
}

const renderComponent = (overrides: Partial<typeof defaultProps> = {}) =>
  render(<HashRateLineChartWithPool {...defaultProps} {...overrides} />)

describe('HashRateLineChartWithPool', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(transformHashRateData).mockReturnValue([
      { time: 1000, value: 90 },
    ] as unknown as HashRateDataPoint[])
    vi.mocked(buildLegends).mockReturnValue([])
    vi.mocked(buildChartData).mockReturnValue({ datasets: [] })
    vi.mocked(calculateMinMaxAvg).mockReturnValue({
      min: '10 TH/s',
      max: '120 TH/s',
      avg: '90 TH/s',
    })
    vi.mocked(calculateTimeRange).mockReturnValue({
      from: 1000,
      to: 2000,
    } as unknown as TimeRangeType)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('rendering', () => {
    it('renders ChartContainer with correct title', () => {
      renderComponent()
      expect(screen.getByTestId('chart-title')).toHaveTextContent('Hash Rate')
    })

    it('renders LineChart', () => {
      renderComponent()
      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    })

    it('renders range selector', () => {
      renderComponent()
      expect(screen.getByTestId('range-selector')).toBeInTheDocument()
    })

    it('renders all four range options', () => {
      renderComponent()
      expect(screen.getByTestId(`range-option-${DATE_RANGE.M5}`)).toBeInTheDocument()
      expect(screen.getByTestId(`range-option-${DATE_RANGE.M30}`)).toBeInTheDocument()
      expect(screen.getByTestId(`range-option-${DATE_RANGE.H3}`)).toBeInTheDocument()
      expect(screen.getByTestId(`range-option-${DATE_RANGE.D1}`)).toBeInTheDocument()
    })

    it('sets initial timeline to M5 on LineChart', () => {
      renderComponent()
      expect(screen.getByTestId('line-chart')).toHaveAttribute('data-timeline', DATE_RANGE.M5)
    })

    it('applies minHeight style', () => {
      const { container } = renderComponent()
      const wrapper = container.querySelector('.mdk-hash-rate-line-chart-with-pool') as HTMLElement
      expect(wrapper.style.minHeight).toBe('350px')
    })
  })

  describe('loading state', () => {
    it('shows loading indicator when isMinerTailLogLoading is true', () => {
      renderComponent({ isMinerTailLogLoading: true })
      expect(screen.getByTestId('chart-loading')).toBeInTheDocument()
    })

    it('shows loading indicator when isMinerpoolInitialLoading is true', () => {
      renderComponent({ isMinerpoolInitialLoading: true })
      expect(screen.getByTestId('chart-loading')).toBeInTheDocument()
    })

    it('does not show loading when both are false', () => {
      renderComponent()
      expect(screen.queryByTestId('chart-loading')).not.toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('shows empty message when no data and not loading', () => {
      vi.mocked(transformHashRateData).mockReturnValue([])
      vi.mocked(buildChartData).mockReturnValue({ datasets: [] })
      renderComponent()
      expect(screen.getByTestId('chart-empty')).toHaveTextContent('No records found')
    })

    it('does not show empty when loading even if no data', () => {
      vi.mocked(transformHashRateData).mockReturnValue([])
      renderComponent({ isMinerTailLogLoading: true })
      expect(screen.queryByTestId('chart-empty')).not.toBeInTheDocument()
    })

    it('does not show empty when datasets have data', () => {
      vi.mocked(buildChartData).mockReturnValue({
        datasets: [{ data: [{ time: 1, value: 1 }] } as unknown as Dataset],
      })
      renderComponent()
      expect(screen.queryByTestId('chart-empty')).not.toBeInTheDocument()
    })
  })

  describe('min/max/avg', () => {
    it('passes minMaxAvg to ChartContainer when data exists', () => {
      vi.mocked(buildChartData).mockReturnValue({
        datasets: [{ data: [{ time: 1, value: 1 }] } as unknown as Dataset],
      })
      renderComponent()
      expect(screen.getByTestId('min-max-avg')).toBeInTheDocument()
      expect(screen.getByTestId('min')).toHaveTextContent('10 TH/s')
      expect(screen.getByTestId('max')).toHaveTextContent('120 TH/s')
      expect(screen.getByTestId('avg')).toHaveTextContent('90 TH/s')
    })

    it('does not pass minMaxAvg when no data', () => {
      vi.mocked(transformHashRateData).mockReturnValue([])
      vi.mocked(buildChartData).mockReturnValue({ datasets: [] })
      renderComponent()
      expect(screen.queryByTestId('min-max-avg')).not.toBeInTheDocument()
    })
  })

  describe('legend', () => {
    it('renders legend items when legends exist and there is data', () => {
      vi.mocked(buildLegends).mockReturnValue([
        { label: 'Pool A', color: '#ff0000' },
        { label: 'Pool B', color: '#00ff00' },
      ])
      vi.mocked(buildChartData).mockReturnValue({
        datasets: [{ label: 'Pool A', data: [{ time: 1, value: 1 }] } as unknown as Dataset],
      })
      renderComponent()
      expect(screen.getByTestId('legend-item-0')).toHaveTextContent('Pool A')
      expect(screen.getByTestId('legend-item-1')).toHaveTextContent('Pool B')
    })

    it('does not render legend when no data', () => {
      vi.mocked(buildLegends).mockReturnValue([{ label: 'Pool A', color: '#ff0000' }])
      vi.mocked(buildChartData).mockReturnValue({ datasets: [] })
      renderComponent()
      expect(screen.queryByTestId('legend-item-0')).not.toBeInTheDocument()
    })

    it('toggles legend hidden state when legend item is clicked', () => {
      vi.mocked(buildLegends).mockReturnValue([{ label: 'Pool A', color: '#ff0000' }])
      vi.mocked(buildChartData).mockReturnValue({
        datasets: [{ label: 'Pool A', data: [{ time: 1, value: 1 }] } as unknown as Dataset],
      })
      renderComponent()
      fireEvent.click(screen.getByTestId('legend-item-0'))
      expect(buildChartData).toHaveBeenLastCalledWith(
        expect.objectContaining({
          legendHidden: expect.objectContaining({ 'Pool A': true }),
        }),
      )
    })

    it('toggles legend hidden back when clicked twice', () => {
      vi.mocked(buildLegends).mockReturnValue([{ label: 'Pool A', color: '#ff0000' }])
      vi.mocked(buildChartData).mockReturnValue({
        datasets: [{ label: 'Pool A', data: [{ time: 1, value: 1 }] } as unknown as Dataset],
      })
      renderComponent()
      fireEvent.click(screen.getByTestId('legend-item-0'))
      fireEvent.click(screen.getByTestId('legend-item-0'))
      expect(buildChartData).toHaveBeenLastCalledWith(
        expect.objectContaining({
          legendHidden: expect.objectContaining({ 'Pool A': false }),
        }),
      )
    })
  })

  describe('timeline selection', () => {
    it('updates timeline on range selector change', () => {
      renderComponent()
      fireEvent.click(screen.getByTestId(`range-option-${DATE_RANGE.D1}`))
      expect(screen.getByTestId('line-chart')).toHaveAttribute('data-timeline', DATE_RANGE.D1)
    })

    it('passes new timeline to filterAndDownsampleMinerPoolData', () => {
      renderComponent()
      fireEvent.click(screen.getByTestId(`range-option-${DATE_RANGE.H3}`))
      expect(filterAndDownsampleMinerPoolData).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.anything(),
        DATE_RANGE.H3,
      )
    })
  })
})
