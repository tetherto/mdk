import type { DateRange } from '@primitives'
import {
  Button,
  cn,
  CurrencyToggler,
  DateRangePicker,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@primitives'
import type { PeriodState } from '@tetherto/mdk-react-adapter'
import {
  CUSTOM_PERIOD,
  GRANULARITIES,
  GRANULARITY_LABELS,
  PERIOD_PRESETS,
  zonedDayOf,
} from '@tetherto/mdk-ui-foundation'
import { format } from 'date-fns/format'
import type { ReactNode } from 'react'
import './period-control.scss'

export type PeriodControlProps = {
  /** The period to show and change, from `usePeriod` */
  state: PeriodState
  /** The site's timezone, in which custom ranges are whole days */
  timezone: string
  /**
   * Show the bucket toggle. Hide it on a page that shows one figure per period
   * @default true
   */
  showGranularity?: boolean
  /** Additional class for the root element */
  className?: string
}

// The date picker works in the browser's local dates, while a period's days are
// days in the site's timezone. Hand it each `YYYY-MM-DD` as that date at local
// midnight, and read its picks back the same way, so the two never shift by a day.
const toPickerDate = (day: string): Date => {
  const [y = 1970, m = 1, d = 1] = day.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const fromPickerDate = (date: Date): string => format(date, 'yyyy-MM-dd')

const Group = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="mdk-period-control__group" role="group" aria-label={label}>
    <span className="mdk-period-control__label">{label}</span>
    <div className="mdk-period-control__row">{children}</div>
  </div>
)

/**
 * Reporting-period control: a rolling preset or a custom day range, the
 * buckets the page aggregates into (a bucket that does not fit the range is
 * disabled), and Reset. Pair it with `usePeriod`, which keeps the period in
 * the URL.
 *
 * @category filters
 * @domain financial-reporting
 * @kernelCapability financial-reporting
 * @tier agent-ready
 */
export const PeriodControl = ({
  state,
  timezone,
  showGranularity = true,
  className,
}: PeriodControlProps) => {
  const { period, query } = state
  const selected: DateRange = {
    from: toPickerDate(zonedDayOf(query.start, timezone)),
    to: toPickerDate(zonedDayOf(query.end - 1, timezone)),
  }

  const onPreset = (value: string) => {
    const preset = PERIOD_PRESETS.find((p) => p.id === value)
    if (preset) state.setPreset(preset.id)
  }
  const onGranularity = (value: string) => {
    const granularity = state.allowed.find((g) => g === value)
    if (granularity) state.setGranularity(granularity)
  }
  const onRange = (range: DateRange | undefined) => {
    if (range?.from && range.to) {
      state.setCustom(fromPickerDate(range.from), fromPickerDate(range.to))
    }
  }

  return (
    <div className={cn('mdk-period-control', className)}>
      <Group label="Period">
        <Select value={period.preset} onValueChange={onPreset}>
          <SelectTrigger className="mdk-period-control__preset">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_PRESETS.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.label}
              </SelectItem>
            ))}
            <SelectItem value={CUSTOM_PERIOD} disabled>
              Custom
            </SelectItem>
          </SelectContent>
        </Select>
        <DateRangePicker selected={selected} showPresets={false} onSelect={onRange} />
      </Group>
      {showGranularity && (
        <Group label="Buckets">
          <CurrencyToggler
            value={query.granularity}
            onChange={onGranularity}
            itemAriaLabel={(label) => `${label} buckets`}
            currencies={GRANULARITIES.map((g) => ({
              value: g,
              label: GRANULARITY_LABELS[g],
              disabled: !state.allowed.includes(g),
            }))}
          />
        </Group>
      )}
      <Button
        variant="secondary"
        className="mdk-period-control__reset"
        onClick={state.reset}
        disabled={state.isDefault}
      >
        Reset
      </Button>
    </div>
  )
}
