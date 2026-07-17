import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { RevenueChart } from '../revenue-chart'
import type { RevenueDataItem, SiteItem } from '../revenue-chart.types'

vi.mock('@primitives/index', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@primitives/index')>()
  return {
    ...actual,
    ChartContainer: ({
      header,
      children,
      loading,
      empty,
    }: {
      header?: React.ReactNode
      children?: React.ReactNode
      loading?: boolean
      empty?: boolean
    }) => (
      <div data-testid="chart-container" data-loading={String(loading)} data-empty={String(empty)}>
        {header}
        {children}
      </div>
    ),
    BarChart: ({ data }: { data: { labels: string[]; datasets: unknown[] } }) => (
      <div data-testid="bar-chart" data-labels={JSON.stringify(data?.labels ?? [])} />
    ),
  }
})

const DEMO_SITE_LIST: SiteItem[] = [
  { id: 'site-a', name: 'Site A' },
  { id: 'site-b', name: 'Site B' },
]

const BTC_SCALE_DATA: RevenueDataItem[] = [
  { timeKey: 'Jan 2024', period: 'monthly', timestamp: 1704067200000, 'site-a': 2.5, 'site-b': 1.8 },
  { timeKey: 'Feb 2024', period: 'monthly', timestamp: 1706745600000, 'site-a': 3.1, 'site-b': 2.2 },
]

const SATS_SCALE_DATA: RevenueDataItem[] = [
  { timeKey: 'Jan 2024', period: 'monthly', timestamp: 1704067200000, 'site-a': 0.0042, 'site-b': 0.0031 },
  { timeKey: 'Feb 2024', period: 'monthly', timestamp: 1706745600000, 'site-a': 0.0051, 'site-b': 0.0028 },
]

describe('RevenueChart', () => {
  it('renders ChartContainer and BarChart', () => {
    render(<RevenueChart data={BTC_SCALE_DATA} siteList={DEMO_SITE_LIST} />)

    expect(screen.getByTestId('chart-container')).toBeInTheDocument()
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })

  it('shows loading state when isLoading is true', () => {
    render(<RevenueChart data={[]} isLoading />)

    expect(screen.getByTestId('chart-container')).toHaveAttribute('data-loading', 'true')
  })

  it('displays BTC currency unit when values are large', () => {
    render(<RevenueChart data={BTC_SCALE_DATA} siteList={DEMO_SITE_LIST} />)

    expect(screen.getByText('₿')).toBeInTheDocument()
  })

  it('displays Sats currency unit when values are small', () => {
    render(<RevenueChart data={SATS_SCALE_DATA} siteList={DEMO_SITE_LIST} />)

    expect(screen.getByText('Sats')).toBeInTheDocument()
  })

  it('displays Revenue title', () => {
    render(<RevenueChart data={BTC_SCALE_DATA} />)

    expect(screen.getByText('Revenue')).toBeInTheDocument()
  })

  it('shows empty state when data is empty', () => {
    render(<RevenueChart data={[]} />)

    expect(screen.getByTestId('chart-container')).toHaveAttribute('data-empty', 'true')
  })

  it('renders correct time labels on the chart', () => {
    render(<RevenueChart data={BTC_SCALE_DATA} siteList={DEMO_SITE_LIST} />)

    const barChart = screen.getByTestId('bar-chart')
    const labels = JSON.parse(barChart.getAttribute('data-labels') ?? '[]') as string[]
    expect(labels).toContain('Jan 2024')
    expect(labels).toContain('Feb 2024')
  })

  it('renders without crashing when siteList is omitted', () => {
    render(<RevenueChart data={BTC_SCALE_DATA} />)

    expect(screen.getByTestId('chart-container')).toBeInTheDocument()
  })
})
