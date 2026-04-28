import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TimelineChart } from '../timeline-chart'
import type { TimelineChartData } from '../timeline-chart.types'

vi.mock('@tetherto/mdk-core-ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tetherto/mdk-core-ui')>()
  return {
    ...actual,
    ChartContainer: vi.fn(({ title, loading, empty, emptyMessage, children }) => (
      <div data-testid="chart-container">
        <span data-testid="title">{title}</span>
        <span data-testid="loading">{String(loading)}</span>
        <span data-testid="empty">{String(empty)}</span>
        <span data-testid="empty-message">{emptyMessage}</span>
        {!loading && !empty && children}
      </div>
    )),
    Loader: vi.fn(() => <div data-testid="loader">Loading...</div>),
    SimpleTooltip: vi.fn(({ children }) => <>{children}</>),
  }
})

const mockData: TimelineChartData = {
  labels: ['Row A', 'Row B'],
  datasets: [
    {
      label: 'Status 1',
      color: '#00ff00',
      data: [
        { x: [1724299140000, 1724299240000], y: 'Row A' },
        { x: [1724299140000, 1724299340000], y: 'Row B' },
      ],
    },
    {
      label: 'Status 2',
      color: '#ff0000',
      data: [{ x: [1724299240000, 1724299440000], y: 'Row A' }],
    },
  ],
}

const emptyData: TimelineChartData = { labels: [], datasets: [] }

describe('TimelineChart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders the ChartContainer', () => {
      render(<TimelineChart initialData={mockData} />)
      expect(screen.getByTestId('chart-container')).toBeInTheDocument()
    })

    it('passes the title to ChartContainer', () => {
      render(<TimelineChart initialData={mockData} title="Test Timeline" />)
      expect(screen.getByTestId('title').textContent).toBe('Test Timeline')
    })

    it('renders without title when not provided', () => {
      render(<TimelineChart initialData={mockData} />)
      expect(screen.getByTestId('title').textContent).toBe('')
    })
  })

  describe('loading state', () => {
    it('passes loading=true to ChartContainer when isLoading', () => {
      render(<TimelineChart initialData={emptyData} isLoading />)
      expect(screen.getByTestId('loading').textContent).toBe('true')
    })

    it('passes loading=false to ChartContainer when not loading', () => {
      render(<TimelineChart initialData={mockData} isLoading={false} />)
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })

    it('passes loading state correctly', () => {
      render(<TimelineChart initialData={emptyData} isLoading />)
      expect(screen.getByTestId('loading').textContent).toBe('true')
    })
  })

  describe('empty state', () => {
    it('shows empty state when no data and not loading', () => {
      render(<TimelineChart initialData={emptyData} />)
      expect(screen.getByTestId('empty').textContent).toBe('true')
    })

    it('does not show empty state when loading', () => {
      render(<TimelineChart initialData={emptyData} isLoading />)
      expect(screen.getByTestId('empty').textContent).toBe('false')
    })

    it('does not show empty state when data exists', () => {
      render(<TimelineChart initialData={mockData} />)
      expect(screen.getByTestId('empty').textContent).toBe('false')
    })

    it('passes empty message to ChartContainer', () => {
      render(<TimelineChart initialData={emptyData} />)
      expect(screen.getByTestId('empty-message').textContent).toBe('No timeline data available')
    })
  })

  describe('with data', () => {
    it('renders timeline rows for each label', () => {
      const { container } = render(<TimelineChart initialData={mockData} />)
      const rows = container.querySelectorAll('.mdk-timeline-chart__row')
      expect(rows.length).toBe(2)
    })

    it('renders row labels correctly', () => {
      const { container } = render(<TimelineChart initialData={mockData} />)
      const labels = container.querySelectorAll('.mdk-timeline-chart__row-label')
      expect(labels[0]?.textContent).toBe('Row A')
      expect(labels[1]?.textContent).toBe('Row B')
    })

    it('renders legend items', () => {
      const { container } = render(<TimelineChart initialData={mockData} />)
      const legendItems = container.querySelectorAll('.mdk-timeline-chart__legend-item')
      expect(legendItems.length).toBe(2)
    })

    it('renders timeline bars', () => {
      const { container } = render(<TimelineChart initialData={mockData} />)
      const bars = container.querySelectorAll('.mdk-timeline-chart__bar')
      expect(bars.length).toBe(3)
    })
  })

  describe('axis titles', () => {
    it('renders y-axis title when provided', () => {
      const { container } = render(
        <TimelineChart initialData={mockData} axisTitleText={{ x: 'Time', y: 'Rows' }} />,
      )
      const yAxisTitle = container.querySelector('.mdk-timeline-chart__y-axis-title')
      expect(yAxisTitle?.textContent).toBe('Rows')
    })

    it('renders x-axis title when provided', () => {
      const { container } = render(
        <TimelineChart initialData={mockData} axisTitleText={{ x: 'Time', y: 'Rows' }} />,
      )
      const xAxisTitle = container.querySelector('.mdk-timeline-chart__x-axis-title')
      expect(xAxisTitle?.textContent).toBe('Time')
    })

    it('does not render y-axis title when empty', () => {
      const { container } = render(
        <TimelineChart initialData={mockData} axisTitleText={{ x: 'Time', y: '' }} />,
      )
      const yAxisTitle = container.querySelector('.mdk-timeline-chart__y-axis-title')
      expect(yAxisTitle).not.toBeInTheDocument()
    })
  })

  describe('data updates', () => {
    it('updates chart data when initialData changes', () => {
      const { rerender, container } = render(<TimelineChart initialData={mockData} />)

      const newData: TimelineChartData = {
        labels: ['Row C'],
        datasets: [
          {
            label: 'Status 3',
            color: '#0000ff',
            data: [{ x: [1724299140000, 1724299240000], y: 'Row C' }],
          },
        ],
      }

      rerender(<TimelineChart initialData={newData} />)

      const labels = container.querySelectorAll('.mdk-timeline-chart__row-label')
      expect(labels.length).toBe(1)
      expect(labels[0]?.textContent).toBe('Row C')
    })

    it('does not merge newData when skipUpdates is true', () => {
      const newData: TimelineChartData = {
        labels: ['Row C'],
        datasets: [
          {
            label: 'Status 3',
            color: '#0000ff',
            data: [{ x: [1724299140000, 1724299240000], y: 'Row C' }],
          },
        ],
      }

      const { container } = render(
        <TimelineChart initialData={mockData} newData={newData} skipUpdates />,
      )

      const labels = container.querySelectorAll('.mdk-timeline-chart__row-label')
      expect(labels.length).toBe(2)
    })
  })

  describe('range prop', () => {
    it('uses provided range for time bounds', () => {
      const range = {
        min: 1724299000000,
        max: 1724300000000,
      }

      const { container } = render(<TimelineChart initialData={mockData} range={range} />)

      const timeLabels = container.querySelectorAll('.mdk-timeline-chart__time-label')
      expect(timeLabels.length).toBeGreaterThan(0)
    })

    it('accepts Date objects for range', () => {
      const range = {
        min: new Date(1724299000000),
        max: new Date(1724300000000),
      }

      const { container } = render(<TimelineChart initialData={mockData} range={range} />)

      const timeLabels = container.querySelectorAll('.mdk-timeline-chart__time-label')
      expect(timeLabels.length).toBeGreaterThan(0)
    })
  })
})
