import { useDevices } from '@tetherto/mdk-react-adapter'
import { getDefaultHistoricalAlertsRange } from '@tetherto/mdk-ui-core'
import { useCallback, useEffect, useState } from 'react'
import type { JSX } from 'react'

import type { CascaderOption } from '@core'

import { SEVERITY_KEY } from '../../../constants/alerts'
import type { Alert } from '../../../types/alerts'
import type { Device } from '../../../types/device'
import { appendIdToTags } from '../../../utils/device-utils'
import type { AlertLocalFilters } from '../../../components/alerts/alerts-types'
import { CurrentAlerts } from '../../../components/alerts/current-alerts/current-alerts'
import { HistoricalAlerts } from '../../../components/alerts/historical-alerts/historical-alerts'
import type { HistoricalAlertsRange } from '../../../components/alerts/historical-alerts/historical-alerts'

import './alerts.scss'

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

/**
 * Full alerts page — combines the searchable current-alerts table, an
 * optional historical-alerts log section, severity filters, and the sound
 * confirmation modal. Wraps `CurrentAlerts` and `HistoricalAlerts` and
 * coordinates their shared filter / date-range / selected-id state.
 *
 * Must be rendered inside `<MdkProvider>` — the embedded tables read tag
 * filters from the devices store and use the timezone formatter hook.
 *
 * @category tables
 * @orkCapability incident-alerts
 * @domain mining-operations
 *
 * @example
 * ```tsx
 * <Alerts
 *   devices={devices}
 *   isCurrentAlertsLoading={isLoading}
 *   isHistoricalAlertsEnabled
 *   historicalAlerts={history}
 *   onAlertClick={(id, uuid) => router.push(`/alerts/${uuid}?device=${id}`)}
 * />
 * ```
 *
 * @tier agent-ready
 */
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
  const { filterTags, setFilterTags } = useDevices()

  const [localFilters, setLocalFilters] = useState<AlertLocalFilters>(() =>
    initialSeverity ? { [SEVERITY_KEY]: initialSeverity } : {},
  )

  useEffect(() => {
    if (initialSeverity) {
      setLocalFilters((prev) => ({ ...prev, [SEVERITY_KEY]: initialSeverity }))
    }
  }, [initialSeverity])

  const [internalRange, setInternalRange] = useState<HistoricalAlertsRange>(() => getDefaultHistoricalAlertsRange())
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
        setFilterTags(appendIdToTags([id]))
      }
      onAlertClick?.(id, uuid)
    },
    [setFilterTags, onAlertClick],
  )

  const handleFilterTagsChange = useCallback(
    (tags: string[]): void => {
      setFilterTags(tags)
    },
    [setFilterTags],
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
