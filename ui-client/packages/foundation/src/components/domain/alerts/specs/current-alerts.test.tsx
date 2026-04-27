import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CurrentAlertsProps } from '../current-alerts/current-alerts'
import { CurrentAlerts } from '../current-alerts/current-alerts'
import type { ParsedAlertEntry } from '../alerts-types'

const { mockUseBeepSound, mockGetCurrentAlerts } = vi.hoisted(() => ({
  mockUseBeepSound: vi.fn(),
  mockGetCurrentAlerts: vi.fn(),
}))

vi.mock('../../../../hooks/use-beep-sound', () => ({
  useBeepSound: mockUseBeepSound,
}))

vi.mock('../../../../hooks/use-timezone', () => ({
  useTimezone: () => ({
    getFormattedDate: (d: Date | number) => `formatted:${new Date(d).toISOString()}`,
  }),
}))

vi.mock('../alerts-utils', () => ({
  getCurrentAlerts: mockGetCurrentAlerts,
}))

vi.mock('../tag-filter-bar/tag-filter-bar', () => ({
  TagFilterBar: ({
    filterTags,
    localFilters,
    onSearchTagsChange,
    onLocalFiltersChange,
  }: {
    filterTags: string[]
    localFilters: unknown
    onSearchTagsChange: (tags: string[]) => void
    onLocalFiltersChange: (filters: unknown) => void
  }) => (
    <div data-testid="tag-filter-bar">
      <span data-testid="tfb-tags">{filterTags.join(',')}</span>
      <span data-testid="tfb-filters">{JSON.stringify(localFilters)}</span>
      <button data-testid="tfb-search" onClick={() => onSearchTagsChange(['new-tag'])} />
      <button
        data-testid="tfb-filter"
        onClick={() => onLocalFiltersChange({ severity: ['high'] })}
      />
    </div>
  ),
}))

vi.mock('../current-alerts/alert-confirmation-modal/alert-confirmation-modal', () => ({
  AlertConfirmationModal: ({ isOpen, onOk }: { isOpen: boolean; onOk: () => void }) =>
    isOpen ? (
      <div data-testid="confirmation-modal">
        <button data-testid="confirmation-ok" onClick={onOk} />
      </div>
    ) : null,
}))

vi.mock('@mdk/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mdk/core')>()
  return {
    ...actual,
    cn: (...args: Array<string | undefined>) => args.filter(Boolean).join(' '),
    DataTable: ({ data, loading }: { data: ParsedAlertEntry[]; loading?: boolean }) => (
      <div
        data-testid="data-table"
        data-loading={String(loading ?? false)}
        data-row-count={data.length}
      >
        {data.map((row) => (
          <div key={row.uuid} data-testid={`row-${row.uuid}`}>
            {row.uuid}
          </div>
        ))}
      </div>
    ),
  }
})

const buildAlert = (overrides: Partial<ParsedAlertEntry> = {}): ParsedAlertEntry => ({
  shortCode: 'M-001',
  device: 'unit-01 1-1',
  alertName: 'Overheating',
  alertCode: 'OH',
  severity: 'critical',
  description: 'desc',
  message: 'msg',
  createdAt: 1_700_000_000_000,
  uuid: 'alert-uuid-1',
  id: 'device-1',
  type: 'miner',
  tags: [],
  status: 'mining',
  actions: { uuid: 'alert-uuid-1' },
  ...overrides,
})

const defaultProps: CurrentAlertsProps = {
  devices: [],
  isLoading: false,
  localFilters: {},
  onLocalFiltersChange: vi.fn(),
  filterTags: [],
  onFilterTagsChange: vi.fn(),
}

const renderComponent = (props: Partial<CurrentAlertsProps> = {}) =>
  render(<CurrentAlerts {...defaultProps} {...props} />)

describe('CurrentAlerts', () => {
  beforeEach(() => {
    mockUseBeepSound.mockReset()
    mockGetCurrentAlerts.mockReset()
    mockGetCurrentAlerts.mockReturnValue([buildAlert()])
    if (typeof window !== 'undefined') {
      window.sessionStorage.clear()
    }
  })

  describe('rendering', () => {
    it('renders the "Current Alerts" title', () => {
      renderComponent()
      expect(screen.getByText('Current Alerts')).toBeInTheDocument()
    })

    it('renders the TagFilterBar with the provided filterTags', () => {
      renderComponent({ filterTags: ['ip-1', 'mac-x'] })
      expect(screen.getByTestId('tfb-tags')).toHaveTextContent('ip-1,mac-x')
    })

    it('renders the DataTable with derived alerts', () => {
      renderComponent()
      expect(screen.getByTestId('data-table')).toHaveAttribute('data-row-count', '1')
      expect(screen.getByTestId('row-alert-uuid-1')).toBeInTheDocument()
    })

    it('forwards loading prop to the DataTable', () => {
      renderComponent({ isLoading: true })
      expect(screen.getByTestId('data-table')).toHaveAttribute('data-loading', 'true')
    })
  })

  describe('confirmation modal', () => {
    it('shows the confirmation modal until the user accepts', () => {
      renderComponent()
      expect(screen.getByTestId('confirmation-modal')).toBeInTheDocument()
    })

    it('hides the modal once the user clicks "Understood"', () => {
      renderComponent()
      fireEvent.click(screen.getByTestId('confirmation-ok'))
      expect(screen.queryByTestId('confirmation-modal')).not.toBeInTheDocument()
    })

    it('persists confirmation in sessionStorage', () => {
      renderComponent()
      fireEvent.click(screen.getByTestId('confirmation-ok'))
      expect(window.sessionStorage.getItem('alertsPageAlertConfirmed')).toBe('true')
    })

    it('does not show the modal when sessionStorage already has confirmation', () => {
      window.sessionStorage.setItem('alertsPageAlertConfirmed', 'true')
      renderComponent()
      expect(screen.queryByTestId('confirmation-modal')).not.toBeInTheDocument()
    })
  })

  describe('beep sound', () => {
    it('does not enable beep when not confirmed', () => {
      renderComponent({ isSoundEnabled: true })
      expect(mockUseBeepSound).toHaveBeenCalledWith({ isAllowed: false })
    })

    it('enables beep when confirmed and a critical alert is present', () => {
      window.sessionStorage.setItem('alertsPageAlertConfirmed', 'true')
      renderComponent({ isSoundEnabled: true })
      expect(mockUseBeepSound).toHaveBeenLastCalledWith({ isAllowed: true })
    })

    it('does not beep when isDemoMode is true', () => {
      window.sessionStorage.setItem('alertsPageAlertConfirmed', 'true')
      renderComponent({ isSoundEnabled: true, isDemoMode: true })
      expect(mockUseBeepSound).toHaveBeenLastCalledWith({ isAllowed: false })
    })

    it('does not beep when severity filter excludes critical', () => {
      window.sessionStorage.setItem('alertsPageAlertConfirmed', 'true')
      renderComponent({ isSoundEnabled: true, localFilters: { severity: ['high'] } })
      expect(mockUseBeepSound).toHaveBeenLastCalledWith({ isAllowed: false })
    })

    it('beeps when severity filter explicitly includes critical', () => {
      window.sessionStorage.setItem('alertsPageAlertConfirmed', 'true')
      renderComponent({ isSoundEnabled: true, localFilters: { severity: ['critical'] } })
      expect(mockUseBeepSound).toHaveBeenLastCalledWith({ isAllowed: true })
    })

    it('does not beep when no critical alerts are returned', () => {
      window.sessionStorage.setItem('alertsPageAlertConfirmed', 'true')
      mockGetCurrentAlerts.mockReturnValue([buildAlert({ severity: 'high' })])
      renderComponent({ isSoundEnabled: true })
      expect(mockUseBeepSound).toHaveBeenLastCalledWith({ isAllowed: false })
    })
  })

  describe('callbacks', () => {
    it('forwards search tag changes to onFilterTagsChange', () => {
      const onFilterTagsChange = vi.fn()
      renderComponent({ onFilterTagsChange })
      fireEvent.click(screen.getByTestId('tfb-search'))
      expect(onFilterTagsChange).toHaveBeenCalledWith(['new-tag'])
    })

    it('forwards local filter changes to onLocalFiltersChange', () => {
      const onLocalFiltersChange = vi.fn()
      renderComponent({ onLocalFiltersChange })
      fireEvent.click(screen.getByTestId('tfb-filter'))
      expect(onLocalFiltersChange).toHaveBeenCalledWith({ severity: ['high'] })
    })

    it('passes onAlertClick through to getCurrentAlerts opts', () => {
      const onAlertClick = vi.fn()
      renderComponent({ onAlertClick, selectedAlertId: 'alert-uuid-1' })
      const lastCall = mockGetCurrentAlerts.mock.calls.at(-1)
      expect(lastCall?.[1]).toEqual(
        expect.objectContaining({
          id: 'alert-uuid-1',
          onAlertClick: expect.any(Function),
        }),
      )
      // verify the wrapped click forwards args
      lastCall?.[1].onAlertClick?.('device-1', 'alert-uuid-1')
      expect(onAlertClick).toHaveBeenCalledWith('device-1', 'alert-uuid-1')
    })
  })
})
