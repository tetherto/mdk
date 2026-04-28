import { useEffect, useMemo, useState } from 'react'

import type { DataTableSortingState } from '@tetherto/mdk-core-ui'
import { cn, DataTable } from '@tetherto/mdk-core-ui'

import _castArray from 'lodash/castArray'
import _isEmpty from 'lodash/isEmpty'

import { SEVERITY } from '../../../../constants/alerts'
import { useBeepSound } from '../../../../hooks/use-beep-sound'
import { useTimezone } from '../../../../hooks/use-timezone'
import type { Device } from '../../../../types/device'
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
  const { getFormattedDate } = useTimezone()

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

  // Reset to defaults whenever local filters change (matches source UX of letting `defaultSortOrder: 'descend'` win)
  const [sorting, setSorting] = useState<DataTableSortingState>(DEFAULT_SORTING)
  useEffect(() => {
    setSorting(DEFAULT_SORTING)
  }, [filterTags, localFilters, selectedAlertId])

  const columns = useMemo(() => getAlertsTableColumns({ getFormattedDate }), [getFormattedDate])

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
        data={alerts}
        columns={columns}
        loading={isLoading}
        sorting={sorting}
        onSortingChange={setSorting}
        getRowId={(record) => record.uuid}
      />
    </div>
  )
}
