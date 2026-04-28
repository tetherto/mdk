import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { HistoricalAlertsProps } from '../historical-alerts/historical-alerts'
import { HistoricalAlerts } from '../historical-alerts/historical-alerts'
import type { ParsedAlertEntry } from '../alerts-types'

const { mockGetHistoricalAlertsData } = vi.hoisted(() => ({
  mockGetHistoricalAlertsData: vi.fn(),
}))

vi.mock('../../../../hooks/use-timezone', () => ({
  useTimezone: () => ({
    getFormattedDate: (d: Date | number) => `formatted:${new Date(d).toISOString()}`,
  }),
}))

vi.mock('../alerts-utils', () => ({
  getHistoricalAlertsData: mockGetHistoricalAlertsData,
}))

vi.mock('@tetherto/mdk-core-ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tetherto/mdk-core-ui')>()
  return {
    ...actual,
    cn: (...args: Array<string | undefined>) => args.filter(Boolean).join(' '),
    DataTable: ({ data, loading }: { data: ParsedAlertEntry[]; loading?: boolean }) => (
      <div
        data-testid="data-table"
        data-loading={String(loading ?? false)}
        data-row-count={data.length}
      />
    ),
    DateRangePicker: ({
      selected,
      onSelect,
    }: {
      selected?: { from?: Date; to?: Date }
      onSelect?: (range: { from: Date; to: Date } | undefined) => void
    }) => (
      <div data-testid="date-range-picker">
        <span data-testid="drp-from">{selected?.from?.toISOString() ?? ''}</span>
        <span data-testid="drp-to">{selected?.to?.toISOString() ?? ''}</span>
        <button
          data-testid="drp-emit"
          onClick={() =>
            onSelect?.({
              from: new Date('2024-06-01T00:00:00.000Z'),
              to: new Date('2024-06-15T00:00:00.000Z'),
            })
          }
        />
        <button data-testid="drp-emit-empty" onClick={() => onSelect?.(undefined)} />
      </div>
    ),
  }
})

const buildEntry = (overrides: Partial<ParsedAlertEntry> = {}): ParsedAlertEntry => ({
  shortCode: 'M-001',
  device: 'unit-01',
  alertName: 'Down',
  alertCode: 'DOWN',
  severity: 'critical',
  description: 'desc',
  message: 'msg',
  createdAt: 1_700_000_000_000,
  uuid: 'h-uuid-1',
  id: 'device-1',
  type: 'miner',
  tags: [],
  status: 'mining',
  actions: { uuid: 'h-uuid-1' },
  ...overrides,
})

const defaultProps: HistoricalAlertsProps = {
  alerts: [],
  isLoading: false,
  localFilters: {},
  filterTags: [],
  dateRange: { start: 1_700_000_000_000, end: 1_700_500_000_000 },
  onDateRangeChange: vi.fn(),
}

const renderComponent = (props: Partial<HistoricalAlertsProps> = {}) =>
  render(<HistoricalAlerts {...defaultProps} {...props} />)

describe('HistoricalAlerts', () => {
  beforeEach(() => {
    mockGetHistoricalAlertsData.mockReset()
    mockGetHistoricalAlertsData.mockReturnValue([buildEntry()])
  })

  it('renders the "Historical Alerts Log" title', () => {
    renderComponent()
    expect(screen.getByText('Historical Alerts Log')).toBeInTheDocument()
  })

  it('renders the DateRangePicker with the controlled range', () => {
    renderComponent()
    expect(screen.getByTestId('drp-from')).toHaveTextContent(
      new Date(1_700_000_000_000).toISOString(),
    )
    expect(screen.getByTestId('drp-to')).toHaveTextContent(
      new Date(1_700_500_000_000).toISOString(),
    )
  })

  it('renders the DataTable with the parsed historical alerts', () => {
    renderComponent()
    expect(screen.getByTestId('data-table')).toHaveAttribute('data-row-count', '1')
  })

  it('forwards the loading flag to the DataTable', () => {
    renderComponent({ isLoading: true })
    expect(screen.getByTestId('data-table')).toHaveAttribute('data-loading', 'true')
  })

  it('calls onDateRangeChange when the picker emits a complete range', () => {
    const onDateRangeChange = vi.fn()
    renderComponent({ onDateRangeChange })
    fireEvent.click(screen.getByTestId('drp-emit'))
    expect(onDateRangeChange).toHaveBeenCalledWith({
      start: new Date('2024-06-01T00:00:00.000Z').getTime(),
      end: new Date('2024-06-15T00:00:00.000Z').getTime(),
    })
  })

  it('ignores empty date range emissions', () => {
    const onDateRangeChange = vi.fn()
    renderComponent({ onDateRangeChange })
    fireEvent.click(screen.getByTestId('drp-emit-empty'))
    expect(onDateRangeChange).not.toHaveBeenCalled()
  })

  it('passes filterTags and localFilters down to the data builder', () => {
    renderComponent({
      filterTags: ['M-001'],
      localFilters: { severity: ['critical'] },
    })
    const lastCall = mockGetHistoricalAlertsData.mock.calls.at(-1)
    expect(lastCall?.[1]).toEqual(
      expect.objectContaining({
        filterTags: ['M-001'],
        localFilters: { severity: ['critical'] },
        onAlertClick: expect.any(Function),
      }),
    )
  })

  it('forwards onAlertClick to the data builder so cell clicks bubble up', () => {
    const onAlertClick = vi.fn()
    renderComponent({ onAlertClick })
    const lastCall = mockGetHistoricalAlertsData.mock.calls.at(-1)
    lastCall?.[1].onAlertClick?.('device-1', 'h-uuid-1')
    expect(onAlertClick).toHaveBeenCalledWith('device-1', 'h-uuid-1')
  })
})
