import { format } from 'date-fns/format'
import { toZonedTime } from 'date-fns-tz'
import _isDate from 'lodash/isDate'
import { useTimezone } from '@tetherto/mdk-react-adapter'
import { DATE, LABEL } from './constants'

export type DataLabelProps = Partial<{
  /**
   * Range start; formatted in the active timezone (`dd/MM/yy`).
   */
  startDate: Date | null
  /**
   * Range end; formatted in the active timezone (`dd/MM/yy`).
   */
  endDate: Date | null
  /**
   * Label text; defaults to `PERIOD`.
   */
  label: string
}>

/**
 * Read-only period label (`PERIOD: start - end`) with timezone-aware dates.
 *
 * @example
 * ```tsx
 * <DataLabel startDate={range[0]} endDate={range[1]} />
 * ```
 * @category display
 * @domain generic
 * @tier agent-ready
 */
export const DataLabel = ({ startDate, endDate, label = LABEL.DEFAULT }: DataLabelProps) => {
  const { timezone } = useTimezone()

  const formatDate = (date?: Date | null): string => {
    if (!_isDate(date) || Number.isNaN(date?.getTime?.())) return DATE.FALLBACK

    const zonedDate = toZonedTime(date, timezone)
    return format(zonedDate, 'dd/MM/yy')
  }

  return (
    <div className="mdk-data-label">
      <span className="mdk-data-label__header">
        {label}
        {LABEL.SUFFIX}
      </span>
      <span className="mdk-data-label__date">{formatDate(startDate)}</span>
      <span className="mdk-data-label__separator">{DATE.SEPARATOR}</span>
      <span className="mdk-data-label__date">{formatDate(endDate)}</span>
    </div>
  )
}
