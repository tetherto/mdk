import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PowerModeTimelineChart } from '../power-mode-timeline-chart'
import { getPowerModeTimelineChartData } from '../power-mode-timeline-chart.helper'

vi.mock('../power-mode-timeline-chart.helper', () => ({
  getPowerModeTimelineChartData: vi.fn(() => ({
    labels: ['miner-1', 'miner-2'],
    datasets: [
      {
        label: 'normal',
        data: [
          { x: [1724299140000, 1724299240000], y: 'miner-1' },
          { x: [1724299140000, 1724299240000], y: 'miner-2' },
        ],
        color: 'var(--mdk-power-mode-normal-color)',
      },
    ],
  })),
  transformToTimelineChartData: vi.fn((helperData) => ({
    labels: helperData.labels,
    datasets: helperData.datasets.map(
      (dataset: { label: string; data: unknown[]; color: string }) => ({
        label: dataset.label,
        data: dataset.data,
        color: dataset.color,
      }),
    ),
  })),
}))

vi.mock('../../../timeline-chart', () => ({
  TimelineChart: vi.fn(({ initialData, newData, isLoading, title, axisTitleText, skipUpdates }) => (
    <div data-testid="timeline-chart">
      <span data-testid="title">{title}</span>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="axis-y">{axisTitleText?.y}</span>
      <span data-testid="axis-x">{axisTitleText?.x}</span>
      <span data-testid="labels-count">{initialData?.labels?.length || 0}</span>
      <span data-testid="datasets-count">{initialData?.datasets?.length || 0}</span>
      <span data-testid="has-new-data">{String(!!newData)}</span>
      <span data-testid="skip-updates">{String(skipUpdates)}</span>
    </div>
  )),
}))

const mockedGetPowerModeTimelineChartData = getPowerModeTimelineChartData as ReturnType<
  typeof vi.fn
>

describe('PowerModeTimelineChart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders the TimelineChart component', () => {
      render(<PowerModeTimelineChart />)
      expect(screen.getByTestId('timeline-chart')).toBeInTheDocument()
    })

    it('passes the default title to TimelineChart', () => {
      render(<PowerModeTimelineChart />)
      expect(screen.getByTestId('title').textContent).toBe('Power Mode Timeline')
    })

    it('passes custom title when provided', () => {
      render(<PowerModeTimelineChart title="Custom Title" />)
      expect(screen.getByTestId('title').textContent).toBe('Custom Title')
    })

    it('passes correct axis titles', () => {
      render(<PowerModeTimelineChart />)
      expect(screen.getByTestId('axis-y').textContent).toBe('Power Mode')
      expect(screen.getByTestId('axis-x').textContent).toBe('Time')
    })
  })

  describe('loading state', () => {
    it('passes loading=true to TimelineChart when isLoading', () => {
      render(<PowerModeTimelineChart isLoading />)
      expect(screen.getByTestId('loading').textContent).toBe('true')
    })

    it('passes loading=false to TimelineChart when not loading', () => {
      render(<PowerModeTimelineChart isLoading={false} />)
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })
  })

  describe('data transformation', () => {
    it('calls getPowerModeTimelineChartData with data and timezone', () => {
      const testData = [
        {
          ts: 1724299140000,
          power_mode_group_aggr: { 'miner-1': 'normal' },
          status_group_aggr: { 'miner-1': 'mining' },
        },
      ]

      render(<PowerModeTimelineChart data={testData} timezone="America/New_York" />)

      expect(mockedGetPowerModeTimelineChartData).toHaveBeenCalledWith(testData, 'America/New_York')
    })

    it('uses UTC as default timezone', () => {
      render(<PowerModeTimelineChart data={[]} />)

      expect(mockedGetPowerModeTimelineChartData).toHaveBeenCalledWith([], 'UTC')
    })

    it('transforms data and passes to TimelineChart', () => {
      render(<PowerModeTimelineChart />)

      expect(screen.getByTestId('labels-count').textContent).toBe('2')
      expect(screen.getByTestId('datasets-count').textContent).toBe('1')
    })
  })

  describe('data updates', () => {
    it('does not pass newData when dataUpdates is empty', () => {
      render(<PowerModeTimelineChart dataUpdates={[]} />)

      expect(screen.getByTestId('has-new-data').textContent).toBe('false')
      expect(screen.getByTestId('skip-updates').textContent).toBe('true')
    })

    it('passes newData when dataUpdates has data', () => {
      const updates = [
        {
          ts: 1724299340000,
          power_mode_group_aggr: { 'miner-1': 'high' },
          status_group_aggr: { 'miner-1': 'mining' },
        },
      ]

      render(<PowerModeTimelineChart dataUpdates={updates} />)

      expect(screen.getByTestId('has-new-data').textContent).toBe('true')
      expect(screen.getByTestId('skip-updates').textContent).toBe('false')
    })
  })

  describe('memoization', () => {
    it('does not re-call getPowerModeTimelineChartData with same props', () => {
      const testData = [
        {
          ts: 1724299140000,
          power_mode_group_aggr: { 'miner-1': 'normal' },
          status_group_aggr: { 'miner-1': 'mining' },
        },
      ]

      const { rerender } = render(<PowerModeTimelineChart data={testData} timezone="UTC" />)
      rerender(<PowerModeTimelineChart data={testData} timezone="UTC" />)

      expect(mockedGetPowerModeTimelineChartData).toHaveBeenCalledTimes(1)
    })

    it('re-calls getPowerModeTimelineChartData when data changes', () => {
      const testData1 = [
        {
          ts: 1724299140000,
          power_mode_group_aggr: { 'miner-1': 'normal' },
          status_group_aggr: { 'miner-1': 'mining' },
        },
      ]
      const testData2 = [
        {
          ts: 1724299240000,
          power_mode_group_aggr: { 'miner-1': 'low' },
          status_group_aggr: { 'miner-1': 'mining' },
        },
      ]

      const { rerender } = render(<PowerModeTimelineChart data={testData1} timezone="UTC" />)
      rerender(<PowerModeTimelineChart data={testData2} timezone="UTC" />)

      expect(mockedGetPowerModeTimelineChartData).toHaveBeenCalledTimes(2)
    })

    it('re-calls getPowerModeTimelineChartData when timezone changes', () => {
      const testData = [
        {
          ts: 1724299140000,
          power_mode_group_aggr: { 'miner-1': 'normal' },
          status_group_aggr: { 'miner-1': 'mining' },
        },
      ]

      const { rerender } = render(<PowerModeTimelineChart data={testData} timezone="UTC" />)
      rerender(<PowerModeTimelineChart data={testData} timezone="America/New_York" />)

      expect(mockedGetPowerModeTimelineChartData).toHaveBeenCalledTimes(2)
    })
  })
})
