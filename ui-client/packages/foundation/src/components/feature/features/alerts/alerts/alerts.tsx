import { useCallback, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import type { CascaderOption } from '@tetherto/mdk-core-ui'

import { CurrentAlerts } from '../../../../domain/alerts/current-alerts/current-alerts'
import { HistoricalAlerts } from '../../../../domain/alerts/historical-alerts/historical-alerts'
import type { HistoricalAlertsRange } from '../../../../domain/alerts/historical-alerts/historical-alerts'
import type { AlertLocalFilters } from '../../../../domain/alerts/alerts-types'
import { SEVERITY_KEY } from '../../../../../constants/alerts'
import { devicesSlice, selectFilterTags } from '../../../../../state/slices/devices-slice'
import type { Alert } from '../../../../../types/alerts'
import type { Device } from '../../../../../types/device'
import { appendIdToTags } from '../../../../../utils/device-utils'

import './alerts.scss'

const { setFilterTags } = devicesSlice.actions

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1_000

const getDefaultRange = (): HistoricalAlertsRange => {
  const end = Date.now()
  return { start: end - FOURTEEN_DAYS_MS, end }
}

export type AlertsProps = {
  /**
   * Devices payload powering the "Current Alerts" table.
   * Mirrors the API response shape of `useGetListThingsQuery({ ... alerts query })`.
   */
  devices?: Device[][]
  /**
   * Loading flag for the "Current Alerts" table.
   */
  isCurrentAlertsLoading?: boolean

  /**
   * Pre-fetched historical alerts log entries.
   */
  historicalAlerts?: Alert[]
  isHistoricalAlertsLoading?: boolean

  /**
   * When true, shows the "Historical Alerts Log" section.
   * Mirrors the `alertsHistoricalLogEnabled` feature flag in the source app.
   * @default false
   */
  isHistoricalAlertsEnabled?: boolean

  /**
   * Optional alert id used to focus on a single alert (deep-link from URL).
   */
  selectedAlertId?: string

  /**
   * Initial severity selection (typically derived from `?severity=` URL param).
   */
  initialSeverity?: string

  /**
   * Callback invoked when the operator clicks an alert row.
   * Receives the device id and alert uuid.
   */
  onAlertClick?: (id?: string, uuid?: string) => void

  /**
   * Controlled date range for the historical alerts. Defaults to last 14 days.
   */
  dateRange?: HistoricalAlertsRange
  onDateRangeChange?: (range: HistoricalAlertsRange) => void

  /**
   * Whether sound notifications are enabled in user preferences.
   * @default false
   */
  isSoundEnabled?: boolean

  /**
   * When true, sound notifications are skipped (e.g. demo / preview).
   * @default false
   */
  isDemoMode?: boolean

  /**
   * Optional site-specific overrides for the type filter.
   */
  typeFiltersForSite?: CascaderOption[]

  /**
   * Optional header (e.g. breadcrumbs) rendered above the alerts.
   */
  header?: React.ReactNode

  className?: string
}

export const Alerts = ({
  devices,
  isCurrentAlertsLoading = false,
  historicalAlerts,
  isHistoricalAlertsLoading = false,
  isHistoricalAlertsEnabled = false,
  selectedAlertId,
  initialSeverity,
  onAlertClick,
  dateRange: providedDateRange,
  onDateRangeChange,
  isSoundEnabled = false,
  isDemoMode = false,
  typeFiltersForSite,
  header,
  className,
}: AlertsProps): JSX.Element => {
  const dispatch = useDispatch()
  const filterTags = (useSelector(selectFilterTags) as string[] | undefined) ?? []

  const [localFilters, setLocalFilters] = useState<AlertLocalFilters>(() =>
    initialSeverity ? { [SEVERITY_KEY]: initialSeverity } : {},
  )

  useEffect(() => {
    if (initialSeverity) {
      setLocalFilters((prev) => ({ ...prev, [SEVERITY_KEY]: initialSeverity }))
    }
  }, [initialSeverity])

  const [internalRange, setInternalRange] = useState<HistoricalAlertsRange>(() => getDefaultRange())
  const dateRange = providedDateRange ?? internalRange
  const handleDateRangeChange = useCallback(
    (next: HistoricalAlertsRange): void => {
      setInternalRange(next)
      onDateRangeChange?.(next)
    },
    [onDateRangeChange],
  )

  const handleAlertClick = useCallback(
    (id?: string, uuid?: string): void => {
      if (id) {
        dispatch(setFilterTags(appendIdToTags([id])))
      }
      onAlertClick?.(id, uuid)
    },
    [dispatch, onAlertClick],
  )

  const handleFilterTagsChange = useCallback(
    (tags: string[]): void => {
      dispatch(setFilterTags(tags))
    },
    [dispatch],
  )

  const wrapperClassName = ['mdk-alerts-page', className].filter(Boolean).join(' ')

  return (
    <div className={wrapperClassName}>
      {header ? <div className="mdk-alerts-page__header">{header}</div> : null}

      <CurrentAlerts
        devices={devices}
        isLoading={isCurrentAlertsLoading}
        localFilters={localFilters}
        onLocalFiltersChange={setLocalFilters}
        filterTags={filterTags}
        onFilterTagsChange={handleFilterTagsChange}
        selectedAlertId={selectedAlertId}
        onAlertClick={handleAlertClick}
        isSoundEnabled={isSoundEnabled}
        isDemoMode={isDemoMode}
        typeFiltersForSite={typeFiltersForSite}
      />

      {isHistoricalAlertsEnabled && (
        <div className="mdk-alerts-page__historical">
          <HistoricalAlerts
            alerts={historicalAlerts}
            isLoading={isHistoricalAlertsLoading}
            localFilters={localFilters}
            filterTags={filterTags}
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
            onAlertClick={handleAlertClick}
          />
        </div>
      )}
    </div>
  )
}
