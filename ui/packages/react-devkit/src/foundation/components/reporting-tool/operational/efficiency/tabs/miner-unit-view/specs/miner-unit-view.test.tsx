import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { EfficiencyMinerUnitView } from '../miner-unit-view'

vi.mock('@core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@core')>()
  return {
    ...actual,
    BarChart: () => <div data-testid="bar-chart" />,
    ChartContainer: ({ children, loading, empty }: any) => (
      <div data-testid="chart-container" data-loading={String(loading)} data-empty={String(empty)}>
        {!loading && !empty && children}
      </div>
    ),
  }
})

vi.mock('@/components/reporting-tool/report-time-frame-selector', () => ({
  ReportTimeFrameSelector: () => <div data-testid="time-frame-selector" />,
  useReportTimeFrameSelectorState: () => ({
    presetTimeFrame: 1,
    dateRange: [new Date('2026-01-08'), new Date('2026-01-14')] as [Date, Date],
    start: new Date('2026-01-14T00:00:00'),
    end: new Date('2026-01-14T23:59:59'),
    setPresetTimeFrame: vi.fn(),
    setDateRange: vi.fn(),
  }),
}))

describe('EfficiencyMinerUnitView', () => {
  describe('header', () => {
    it('renders the "Efficiency by Mining Unit" title', () => {
      render(<EfficiencyMinerUnitView />)
      expect(screen.getByText('Efficiency by Mining Unit')).toBeInTheDocument()
    })

    it('renders the time frame selector', () => {
      render(<EfficiencyMinerUnitView />)
      expect(screen.getByTestId('time-frame-selector')).toBeInTheDocument()
    })
  })

  describe('loading state', () => {
    it('passes loading=true to ChartContainer when isLoading is true', () => {
      render(<EfficiencyMinerUnitView isLoading />)
      expect(screen.getByTestId('chart-container')).toHaveAttribute('data-loading', 'true')
    })

    it('does not show the chart while loading', () => {
      render(<EfficiencyMinerUnitView isLoading />)
      expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('passes empty=true to ChartContainer when isEmpty is true', () => {
      render(<EfficiencyMinerUnitView isEmpty />)
      expect(screen.getByTestId('chart-container')).toHaveAttribute('data-empty', 'true')
    })

    it('passes empty=true when chartInput has no series data', () => {
      render(<EfficiencyMinerUnitView chartInput={{ series: [] }} />)
      expect(screen.getByTestId('chart-container')).toHaveAttribute('data-empty', 'true')
    })
  })

  describe('chart rendering', () => {
    it('renders the BarChart when data is present and not loading', () => {
      render(
        <EfficiencyMinerUnitView
          chartInput={{
            labels: ['container_01'],
            series: [{ label: 'Site Efficiency', values: [23] }],
          }}
        />,
      )
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    })

    it('does not show the chart when empty', () => {
      render(<EfficiencyMinerUnitView isEmpty />)
      expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument()
    })
  })

  describe('onTimeFrameChange', () => {
    it('calls onTimeFrameChange on mount with the resolved start and end dates', () => {
      const onTimeFrameChange = vi.fn()
      render(<EfficiencyMinerUnitView onTimeFrameChange={onTimeFrameChange} />)
      expect(onTimeFrameChange).toHaveBeenCalledOnce()
      expect(onTimeFrameChange).toHaveBeenCalledWith(
        new Date('2026-01-14T00:00:00'),
        new Date('2026-01-14T23:59:59'),
      )
    })

    it('does not throw when onTimeFrameChange is not provided', () => {
      expect(() => render(<EfficiencyMinerUnitView />)).not.toThrow()
    })
  })
})
