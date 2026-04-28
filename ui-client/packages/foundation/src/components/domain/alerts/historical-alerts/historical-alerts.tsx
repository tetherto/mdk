import { useMemo, useState } from 'react'

import type { DataTableSortingState, DateRange } from '@tetherto/core'
import { cn, DataTable, DateRangePicker } from '@tetherto/core'

import { useTimezone } from '../../../../hooks/use-timezone'
import type { Alert } from '../../../../types/alerts'
import { getAlertsTableColumns } from '../alerts-table-columns'
import type { AlertLocalFilters, AlertTableRecord } from '../alerts-types'
import { getHistoricalAlertsData } from '../alerts-utils'
import { AlertsTableTitle } from '../alerts-table-title/alerts-table-title'

const DEFAULT_SORTING: DataTableSortingState = [
  { id: 'severity', desc: true },
  { id: 'createdAt', desc: true },
]

export type HistoricalAlertsRange = {
  start: number
  end: number
}

export type HistoricalAlertsProps = {
  /**
   * Pre-fetched historical alerts log entries (each with a `thing` device payload).
   */
  alerts?: Alert[]
  isLoading?: boolean

  /**
   * Filters and search tags coming from the parent (typically shared with `CurrentAlerts`).
   */
  localFilters: AlertLocalFilters
  filterTags: string[]

  /**
   * Selected date range for the historical query (controlled).
   */
  dateRange: HistoricalAlertsRange
  onDateRangeChange: (range: HistoricalAlertsRange) => void

  onAlertClick?: (id?: string, uuid?: string) => void

  className?: string
}

export const HistoricalAlerts = ({
  alerts = [],
  isLoading = false,
  localFilters,
  filterTags,
  dateRange,
  onDateRangeChange,
  onAlertClick,
  className,
}: HistoricalAlertsProps): JSX.Element => {
  const { getFormattedDate } = useTimezone()

  const [sorting, setSorting] = useState<DataTableSortingState>(DEFAULT_SORTING)

  const data = useMemo<AlertTableRecord[]>(
    () =>
      getHistoricalAlertsData(alerts, {
        filterTags,
        localFilters,
        onAlertClick: (id, uuid) => onAlertClick?.(id, uuid),
      }),
    [alerts, filterTags, localFilters, onAlertClick],
  )

  const columns = useMemo(() => getAlertsTableColumns({ getFormattedDate }), [getFormattedDate])

  const selectedRange = useMemo<DateRange>(
    () => ({ from: new Date(dateRange.start), to: new Date(dateRange.end) }),
    [dateRange],
  )

  const handleRangeChange = (range: DateRange | undefined): void => {
    if (!range?.from || !range.to) return
    onDateRangeChange({ start: range.from.getTime(), end: range.to.getTime() })
  }

  return (
    <div className={cn('mdk-alerts-historical', className)}>
      <AlertsTableTitle
        title="Historical Alerts Log"
        subtitle={<DateRangePicker selected={selectedRange} onSelect={handleRangeChange} />}
      />

      <DataTable<AlertTableRecord>
        data={data}
        columns={columns}
        loading={isLoading}
        sorting={sorting}
        onSortingChange={setSorting}
        getRowId={(record) => record.uuid}
      />
    </div>
  )
}
