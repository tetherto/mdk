import { cn, DateRangePicker as CoreDateRangePicker, type DateRange } from '@core'
import { type JSX, useCallback, useMemo } from 'react'
import './dashboard-date-range-picker.scss'

export type DashboardDateRange = {
  /** Window start, milliseconds since epoch. */
  start: number
  /** Window end, milliseconds since epoch. */
  end: number
}

export type DashboardDateRangePickerProps = {
  /** Current range as `{ start, end }` epoch-millisecond timestamps. */
  value: DashboardDateRange
  /** Fires with the next `{ start, end }` window when the user applies a range. */
  onChange: (next: DashboardDateRange) => void
  /** Display format. Defaults to `dd/MM/yyyy`. */
  dateFormat?: string
  /** Disable the trigger. */
  disabled?: boolean
  /** Optional class hook. */
  className?: string
}

/**
 * Dashboard-friendly wrapper around the core `DateRangePicker` that speaks
 * `{ start, end }` epoch-millisecond timestamps instead of `Date` objects, so
 * it drops straight into `useDashboardDateRange` from
 * `@tetherto/mdk-react-adapter`.
 *
 * @category dashboard
 * @domain mining-operations
 * @tier agent-ready
 * @orkCapability time-range-filtering
 *
 * @example
 * ```tsx
 * const { start, end, setRange } = useDashboardDateRange()
 * <DashboardDateRangePicker
 *   value={{ start, end }}
 *   onChange={({ start, end }) => setRange(start, end)}
 * />
 * ```
 */
export const DashboardDateRangePicker = ({
  value,
  onChange,
  dateFormat = 'dd/MM/yyyy',
  disabled = false,
  className,
}: DashboardDateRangePickerProps): JSX.Element => {
  const selected = useMemo<DateRange>(
    () => ({ from: new Date(value.start), to: new Date(value.end) }),
    [value.start, value.end],
  )

  const handleSelect = useCallback(
    (range: DateRange | undefined): void => {
      if (!range?.from || !range?.to) return
      onChange({ start: range.from.getTime(), end: range.to.getTime() })
    },
    [onChange],
  )

  return (
    <CoreDateRangePicker
      selected={selected}
      onSelect={handleSelect}
      dateFormat={dateFormat}
      disabled={disabled}
      triggerClassName={cn('mdk-dashboard-date-range-picker__trigger', className)}
      modalClassName="mdk-dashboard-date-range-picker__modal"
    />
  )
}

DashboardDateRangePicker.displayName = 'DashboardDateRangePicker'
