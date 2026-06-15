import { useMemo, useState } from 'react'
import type { JSX } from 'react'

import type { DataTableSortingState } from '@core'
import { cn, DataTable } from '@core'

import _castArray from 'lodash/castArray'
import _isEmpty from 'lodash/isEmpty'

import { SEVERITY } from '../../../constants/alerts'
import { useBeepSound, useTimezoneFormatter } from '@tetherto/mdk-react-adapter'
import type { Device } from '../../../types/device'
import { getAlertsTableColumns } from '../alerts-table-columns'
import type { AlertLocalFilters, AlertTableRecord } from '../alerts-types'
import { getCurrentAlerts } from '../alerts-utils'
import { AlertsTableTitle } from '../alerts-table-title/alerts-table-title'
import { TagFilterBar } from '../tag-filter-bar/tag-filter-bar'
import type { TagFilterBarProps } from '../tag-filter-bar/tag-filter-bar'
import { AlertConfirmationModal } from './alert-confirmation-modal/alert-confirmation-modal'

const ALERT_CONFIRMATION_KEY = 'alertsPageAlertConfirmed'

const DEFAULT_SORTING: DataTableSortingState = [
  { id: 'severity', desc: true },
  { id: 'createdAt', desc: true },
]

export type CurrentAlertsProps = {
  /**
   * Raw devices (with last.alerts) used to derive current alerts from.
   * Shape mirrors the API response from the source app.
   */
  devices?: Device[][]
  isLoading?: boolean

  /**
   * Filters controlled outside (typically by URL severity param).
   */
  localFilters: AlertLocalFilters
  onLocalFiltersChange: (filters: AlertLocalFilters) => void

  /**
   * Search tags (controlled). Mirrors the redux `selectFilterTags` slice in the source app.
   */
  filterTags: string[]
  onFilterTagsChange: (tags: string[]) => void

  /**
   * Optional id used to focus on a single alert (deep-link from URL).
   */
  selectedAlertId?: string

  /**
   * Click handler when the user opens an alert (right arrow icon in the row).
   */
  onAlertClick?: (id?: string, uuid?: string) => void

  /**
   * Whether sound notifications are enabled in user preferences (e.g. theme slice).
   * @default false
   */
  isSoundEnabled?: boolean

  /**
   * Skip sound entirely (e.g. in demo/preview environments).
   * @default false
   */
  isDemoMode?: boolean

  /**
   * Optional site-specific overrides for the type filter.
   */
  typeFiltersForSite?: TagFilterBarProps['typeFiltersForSite']

  className?: string
}

/**
 * Sortable, searchable data table of currently active alerts derived from a
 * raw devices payload. Plays an audible beep when a critical alert is present
 * (gated by `isSoundEnabled` + user confirmation modal).
 *
 * @category tables
 * @orkCapability incident-alerts
 * @domain mining-operations
 *
 * @example
 * ```tsx
 * <CurrentAlerts
 *   devices={devices}
 *   localFilters={localFilters}
 *   onLocalFiltersChange={setLocalFilters}
 *   filterTags={filterTags}
 *   onFilterTagsChange={setFilterTags}
 *   onAlertClick={(id) => router.push(`/alerts/${id}`)}
 * />
 * ```
 * @tier agent-ready
 */
export const CurrentAlerts = ({
  devices,
  isLoading = false,
  localFilters,
  onLocalFiltersChange,
  filterTags,
  onFilterTagsChange,
  selectedAlertId,
  onAlertClick,
  isSoundEnabled = false,
  isDemoMode = false,
  typeFiltersForSite,
  className,
}: CurrentAlertsProps): JSX.Element => {
  const { getFormattedDate } = useTimezoneFormatter()

  const [confirmed, setConfirmed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.sessionStorage.getItem(ALERT_CONFIRMATION_KEY) === 'true'
  })

  const handleConfirmed = (): void => {
    setConfirmed(true)
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(ALERT_CONFIRMATION_KEY, 'true')
    }
  }

  const alerts = useMemo<AlertTableRecord[]>(
    () =>
      getCurrentAlerts((devices ?? []) as Device[][], {
        filterTags,
        localFilters,
        onAlertClick: (id, uuid) => onAlertClick?.(id, uuid),
        id: selectedAlertId,
      }),
    [devices, filterTags, localFilters, selectedAlertId, onAlertClick],
  )

  const hasCriticalAlert = useMemo<boolean>(
    () => alerts.some((alert) => alert.severity === SEVERITY.CRITICAL),
    [alerts],
  )

  const isCriticalFilterActive = useMemo<boolean>(
    () =>
      _isEmpty(localFilters.severity) ||
      _castArray(localFilters.severity ?? []).includes(SEVERITY.CRITICAL),
    [localFilters.severity],
  )

  const shouldBeep = !isDemoMode && isSoundEnabled && hasCriticalAlert && isCriticalFilterActive

  useBeepSound({ isAllowed: confirmed && shouldBeep })

  const handleSearchChange = (tags: string[]): void => {
    onFilterTagsChange(tags)
  }

  const columns = useMemo(() => getAlertsTableColumns({ getFormattedDate }), [getFormattedDate])

  // Changing this key remounts DataTable, resetting its internal sort to DEFAULT_SORTING.
  // This replaces the old controlled-sorting + useEffect pattern that triggered a
  // "state update before mount" warning via Radix useControllableState.
  const tableKey = useMemo(
    () => `${filterTags.join('\0')}|${JSON.stringify(localFilters)}|${selectedAlertId ?? ''}`,
    [filterTags, localFilters, selectedAlertId],
  )

  return (
    <div className={cn('mdk-alerts-current', className)}>
      <AlertConfirmationModal isOpen={!confirmed} onOk={handleConfirmed} />

      <AlertsTableTitle
        title="Current Alerts"
        subtitle={
          <TagFilterBar
            filterTags={filterTags}
            localFilters={localFilters}
            onSearchTagsChange={handleSearchChange}
            onLocalFiltersChange={onLocalFiltersChange}
            typeFiltersForSite={typeFiltersForSite}
          />
        }
      />

      <DataTable<AlertTableRecord>
        key={tableKey}
        data={alerts}
        columns={columns}
        loading={isLoading}
        defaultSorting={DEFAULT_SORTING}
        getRowId={(record) => record.uuid}
      />
    </div>
  )
}
