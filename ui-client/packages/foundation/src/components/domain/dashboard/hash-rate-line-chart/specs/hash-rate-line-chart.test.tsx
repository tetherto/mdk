import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HashRateLineChart } from '../hash-rate-line-chart'
import type { HashRateLogEntry } from '../hash-rate-line-chart-utils'

import type { TimeRangeType } from '@tetherto/mdk-core-ui'
import { ChartContainer } from '@tetherto/mdk-core-ui'
import { getTimelineRadioButtons } from '../../../../../utils/timeline-dropdown-data-utils'
import { getHashRateGraphData } from '../hash-rate-line-chart-utils'
import { WEBAPP_DISPLAY_NAME } from '../../../../../constants'

vi.mock('@tetherto/mdk-core-ui', () => ({
  ChartContainer: vi.fn(
    ({
      title,
      highlightedValue,
      legendData,
      loading,
      empty,
      emptyMessage,
      minMaxAvg,
      timeRange,
      rangeSelector,
      children,
    }) => (
      <div data-testid="chart-container">
        <span data-testid="title">{title}</span>
        {highlightedValue && (
          <span data-testid="highlighted-value">
            {highlightedValue.value}
            {highlightedValue.unit && (
              <span data-testid="highlighted-unit">{highlightedValue.unit}</span>
            )}
          </span>
        )}
        {legendData?.map((item: { label: string; color: string; hidden: boolean }, i: number) => (
          <span key={i} data-testid={`legend-item-${i}`} data-hidden={String(item.hidden)}>
            {item.label}
          </span>
        ))}
        {loading && <span data-testid="loading" />}
        {empty && <span data-testid="empty">{emptyMessage ?? 'No data available'}</span>}
        {minMaxAvg && (
          <span data-testid="min-max-avg">
            {minMaxAvg.min}|{minMaxAvg.avg}|{minMaxAvg.max}
          </span>
        )}
        {timeRange && <span data-testid="time-range">{timeRange}</span>}
        {rangeSelector?.options.map((opt: { value: string; label: string }) => (
          <button key={opt.value} onClick={() => rangeSelector.onChange(opt.value)}>
            {opt.label}
          </button>
        ))}
        {children}
      </div>
    ),
  ),
  LineChart: vi.fn(({ data, height, timeline, fixedTimezone, shouldResetZoom }) => (
    <div
      data-testid="line-chart"
      data-datasets={JSON.stringify(data?.datasets?.map((d: { label: string }) => d.label))}
      data-height={height}
      data-timeline={timeline}
      data-timezone={fixedTimezone}
      data-should-reset-zoom={String(shouldResetZoom)}
    />
  )),
}))

vi.mock('../../../../../constants/charts', () => ({
  CHART_TITLES: { HASH_RATE: 'Hash Rate' },
}))

vi.mock('../../../../../utils/timeline-dropdown-data-utils', () => ({
  getTimelineRadioButtons: vi.fn(({ isOneMinEnabled }: { isOneMinEnabled?: boolean }) =>
    isOneMinEnabled
      ? [
          { value: '1m', label: '1 Min' },
          { value: '5m', label: '5 Min' },
          { value: '30m', label: '30 Min' },
          { value: '3h', label: '3 H' },
          { value: '1D', label: '1 D' },
        ]
      : [
          { value: '5m', label: '5 Min' },
          { value: '30m', label: '30 Min' },
          { value: '3h', label: '3 H' },
          { value: '1D', label: '1 D' },
        ],
  ),
}))

vi.mock('../hash-rate-line-chart-utils', () => ({
  getHashRateGraphData: vi.fn(() => ({
    yTicksFormatter: vi.fn((v: number) => `${v} TH/s`),
    currentValueLabel: { value: '1.66', unit: 'PH/s', realValue: 1660000 },
    minMaxAvg: { min: '1.63 TH/s', avg: '1.66 TH/s', max: '1.69 TH/s' },
    timeRange: 'Last 24 hours',
    datasets: [
      {
        type: 'line',
        label: `${WEBAPP_DISPLAY_NAME} Hash Rate`,
        data: [{ x: 1000, y: 500 }],
        borderColor: '#59E8E8',
        pointRadius: 1,
      },
    ],
  })),
}))

const makeEntry = (ts: number, hashrate?: number): HashRateLogEntry => ({
  ts,
  hashrate_mhs_1m_sum_aggr: hashrate,
})

const DATA = [makeEntry(1000, 100), makeEntry(2000, 200)]
const REALTIME = makeEntry(3000, 999)

describe('HashRateLineChart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getHashRateGraphData).mockReturnValue({
      yTicksFormatter: vi.fn((v: number) => `${v} TH/s`),
      currentValueLabel: { value: 1.66, unit: 'PH/s', realValue: 1660000 },
      minMaxAvg: { min: '1.63 TH/s', avg: '1.66 TH/s', max: '1.69 TH/s' },
      timeRange: 'Last 24 hours' as TimeRangeType,
      datasets: [
        {
          type: 'line',
          label: `${WEBAPP_DISPLAY_NAME} Hash Rate`,
          data: [{ x: 1000, y: 500 }],
          borderColor: '#59E8E8',
          pointRadius: 1,
        },
      ],
    })
  })

  describe('rendering', () => {
    it('renders ChartContainer', () => {
      render(<HashRateLineChart />)
      expect(screen.getByTestId('chart-container')).toBeInTheDocument()
    })

    it('renders LineChart', () => {
      render(<HashRateLineChart />)
      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    })

    it('renders with no props without throwing', () => {
      expect(() => render(<HashRateLineChart />)).not.toThrow()
    })
  })

  describe('title', () => {
    it('passes Hash Rate title to ChartContainer', () => {
      render(<HashRateLineChart />)
      expect(screen.getByTestId('title')).toHaveTextContent('Hash Rate')
    })
  })

  describe('highlightedValue', () => {
    it('renders highlighted value when currentValueLabel has value', () => {
      render(<HashRateLineChart />)
      expect(screen.getByTestId('highlighted-value')).toBeInTheDocument()
    })

    it('extracts value from currentValueLabel object', () => {
      render(<HashRateLineChart />)
      expect(screen.getByTestId('highlighted-value')).toHaveTextContent('1.66')
    })

    it('extracts unit from currentValueLabel object', () => {
      render(<HashRateLineChart />)
      expect(screen.getByTestId('highlighted-unit')).toHaveTextContent('PH/s')
    })

    it('does not render highlighted value when currentValueLabel is falsy', () => {
      vi.mocked(getHashRateGraphData).mockReturnValue({
        ...vi.mocked(getHashRateGraphData).mock.results[0]?.value,
        currentValueLabel: null,
        datasets: [],
        minMaxAvg: { min: '0', avg: '0', max: '0' },
        timeRange: '',
        yTicksFormatter: vi.fn(),
      })
      render(<HashRateLineChart />)
      expect(screen.queryByTestId('highlighted-value')).not.toBeInTheDocument()
    })

    it('falls back to string when currentValueLabel is a primitive', () => {
      vi.mocked(getHashRateGraphData).mockReturnValue({
        ...vi.mocked(getHashRateGraphData).mock.results[0]?.value,
        currentValueLabel: '1.66 PH/s' as unknown as {
          value: string
          unit: string
          realValue: number
        },
        datasets: [],
        minMaxAvg: { min: '0', avg: '0', max: '0' },
        timeRange: '',
        yTicksFormatter: vi.fn(),
      })
      render(<HashRateLineChart />)
      expect(screen.getByTestId('highlighted-value')).toHaveTextContent('1.66 PH/s')
    })
  })

  describe('legendData', () => {
    it('renders a legend item per dataset', () => {
      render(<HashRateLineChart />)
      expect(screen.getByTestId('legend-item-0')).toBeInTheDocument()
    })

    it('legend item label matches dataset label', () => {
      render(<HashRateLineChart />)
      expect(screen.getByTestId('legend-item-0')).toHaveTextContent(
        `${WEBAPP_DISPLAY_NAME} Hash Rate`,
      )
    })

    it('legend items are not hidden by default', () => {
      render(<HashRateLineChart />)
      expect(screen.getByTestId('legend-item-0')).toHaveAttribute('data-hidden', 'false')
    })

    it('renders multiple legend items for multiple datasets', () => {
      vi.mocked(getHashRateGraphData).mockReturnValue({
        yTicksFormatter: vi.fn(),
        minMaxAvg: { min: '0', avg: '0', max: '0' },
        datasets: [
          { type: 'line', label: 'Dataset A', data: [], borderColor: '#59E8E8', pointRadius: 1 },
          { type: 'line', label: 'Dataset B', data: [], borderColor: '#59E8E8', pointRadius: 1 },
        ],
        currentValueLabel: {
          value: null,
          unit: '',
          realValue: 0,
        },
        timeRange: 'day',
      })
      render(<HashRateLineChart />)
      expect(screen.getByTestId('legend-item-0')).toHaveTextContent('Dataset A')
      expect(screen.getByTestId('legend-item-1')).toHaveTextContent('Dataset B')
    })
  })

  describe('loading state', () => {
    it('passes loading=true to ChartContainer', () => {
      render(<HashRateLineChart loading />)
      expect(screen.getByTestId('loading')).toBeInTheDocument()
    })

    it('does not show loading indicator when loading is false', () => {
      render(<HashRateLineChart loading={false} />)
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument()
    })

    it('does not show empty state when loading is true', () => {
      render(<HashRateLineChart loading data={[]} />)
      expect(screen.queryByTestId('empty')).not.toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('shows empty state when data is empty and not loading', () => {
      render(<HashRateLineChart data={[]} />)
      expect(screen.getByTestId('empty')).toBeInTheDocument()
    })

    it('does not show empty state when data has entries', () => {
      render(<HashRateLineChart data={DATA} />)
      expect(screen.queryByTestId('empty')).not.toBeInTheDocument()
    })

    it('does not show empty state when loading even with empty data', () => {
      render(<HashRateLineChart data={[]} loading />)
      expect(screen.queryByTestId('empty')).not.toBeInTheDocument()
    })
  })

  describe('minMaxAvg', () => {
    it('passes minMaxAvg to ChartContainer', () => {
      render(<HashRateLineChart data={DATA} />)
      expect(screen.getByTestId('min-max-avg')).toHaveTextContent('1.63 TH/s|1.66 TH/s|1.69 TH/s')
    })
  })

  describe('timeRange', () => {
    it('passes timeRange to ChartContainer', () => {
      render(<HashRateLineChart data={DATA} />)
      expect(screen.getByTestId('time-range')).toHaveTextContent('Last 24 hours')
    })
  })

  describe('rangeSelector', () => {
    it('renders default range buttons (no isOneMinEnabled)', () => {
      render(<HashRateLineChart />)
      expect(screen.getByText('5 Min')).toBeInTheDocument()
      expect(screen.getByText('30 Min')).toBeInTheDocument()
      expect(screen.getByText('3 H')).toBeInTheDocument()
      expect(screen.getByText('1 D')).toBeInTheDocument()
    })

    it('renders 1 Min button when isOneMinEnabled', () => {
      render(<HashRateLineChart isOneMinEnabled />)
      expect(screen.getByText('1 Min')).toBeInTheDocument()
    })

    it('does not render 1 Min button when isOneMinEnabled is false', () => {
      render(<HashRateLineChart isOneMinEnabled={false} />)
      expect(screen.queryByText('1 Min')).not.toBeInTheDocument()
    })

    it('defaults selected timeline to first radio button value', () => {
      render(<HashRateLineChart />)
      expect(screen.getByTestId('line-chart')).toHaveAttribute('data-timeline', '5m')
    })

    it('defaults to first radio button value when isOneMinEnabled', () => {
      render(<HashRateLineChart isOneMinEnabled />)
      expect(screen.getByTestId('line-chart')).toHaveAttribute('data-timeline', '1m')
    })

    it('updates selected timeline when a range button is clicked', () => {
      render(<HashRateLineChart />)
      fireEvent.click(screen.getByText('3 H'))
      expect(screen.getByTestId('line-chart')).toHaveAttribute('data-timeline', '3h')
    })

    it('calls getTimelineRadioButtons with isOneMinEnabled', () => {
      render(<HashRateLineChart isOneMinEnabled />)
      expect(vi.mocked(getTimelineRadioButtons)).toHaveBeenCalledWith({ isOneMinEnabled: true })
    })

    it('calls getTimelineRadioButtons with isOneMinEnabled=undefined by default', () => {
      render(<HashRateLineChart />)
      expect(vi.mocked(getTimelineRadioButtons)).toHaveBeenCalledWith({
        isOneMinEnabled: undefined,
      })
    })
  })

  describe('LineChart props', () => {
    it('passes datasets to LineChart', () => {
      render(<HashRateLineChart />)
      expect(screen.getByTestId('line-chart')).toHaveAttribute(
        'data-datasets',
        JSON.stringify([`${WEBAPP_DISPLAY_NAME} Hash Rate`]),
      )
    })

    it('passes height to LineChart', () => {
      render(<HashRateLineChart height={400} />)
      expect(screen.getByTestId('line-chart')).toHaveAttribute('data-height', '400')
    })

    it('passes fixedTimezone to LineChart', () => {
      render(<HashRateLineChart fixedTimezone="America/New_York" />)
      expect(screen.getByTestId('line-chart')).toHaveAttribute('data-timezone', 'America/New_York')
    })

    it('passes shouldResetZoom=false to LineChart', () => {
      render(<HashRateLineChart />)
      expect(screen.getByTestId('line-chart')).toHaveAttribute('data-should-reset-zoom', 'false')
    })

    it('passes selected timeline to LineChart', () => {
      render(<HashRateLineChart />)
      expect(screen.getByTestId('line-chart')).toHaveAttribute('data-timeline', '5m')
    })

    it('updates LineChart timeline when range button clicked', () => {
      render(<HashRateLineChart />)
      fireEvent.click(screen.getByText('30 Min'))
      expect(screen.getByTestId('line-chart')).toHaveAttribute('data-timeline', '30m')
    })
  })

  describe('getHashRateGraphData', () => {
    it('calls getHashRateGraphData with data and realtimeHashrateData', () => {
      render(<HashRateLineChart data={DATA} realtimeHashrateData={REALTIME} />)
      expect(vi.mocked(getHashRateGraphData)).toHaveBeenCalledWith(DATA, REALTIME)
    })

    it('calls getHashRateGraphData with empty array when data not provided', () => {
      render(<HashRateLineChart />)
      expect(vi.mocked(getHashRateGraphData)).toHaveBeenCalledWith([], undefined)
    })

    it('calls getHashRateGraphData with no realtime when not provided', () => {
      render(<HashRateLineChart data={DATA} />)
      expect(vi.mocked(getHashRateGraphData)).toHaveBeenCalledWith(DATA, undefined)
    })

    it('calls getHashRateGraphData exactly once on initial render', () => {
      render(<HashRateLineChart data={DATA} />)
      expect(vi.mocked(getHashRateGraphData)).toHaveBeenCalledTimes(1)
    })
  })

  describe('ChartContainer props', () => {
    it('passes all required props to ChartContainer', () => {
      render(<HashRateLineChart data={DATA} />)
      expect(vi.mocked(ChartContainer)).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Hash Rate',
          loading: undefined,
          empty: false,
          minMaxAvg: expect.objectContaining({
            min: '1.63 TH/s',
            avg: '1.66 TH/s',
            max: '1.69 TH/s',
          }),
          timeRange: 'Last 24 hours',
          rangeSelector: expect.objectContaining({
            value: '5m',
            options: expect.arrayContaining([{ value: '5m', label: '5 Min' }]),
          }),
        }),
        expect.anything(),
      )
    })
  })
})
