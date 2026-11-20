import type { DateRange, PresetItem } from '@primitives'
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
  granularityDisabledReason,
  PERIOD_PRESETS,
  zonedDayOf,
} from '@tetherto/mdk-ui-foundation'
import type { RollingPresetId } from '@tetherto/mdk-ui-foundation'
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

const DAY = 24 * 60 * 60 * 1000

// `YYYY-MM-DD` moved by whole days; calendar arithmetic, so no timezone is involved.
const shiftDay = (day: string, days: number): string => {
  const [y = 1970, m = 1, d = 1] = day.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

// The `days` whole days ending `today`: "Last 7 days" is today and the six days before it.
const daysEnding = (today: string, days: number): { from: string; to: string } => ({
  from: shiftDay(today, 1 - days),
  to: today,
})

// Rolling presets counted in days. A rolling range ends now, so it touches one more calendar
// day than it is long; the picker shows it as that many whole days ending today instead.
const DAY_PRESETS: ReadonlySet<RollingPresetId> = new Set(['7d', '30d', '90d', '12m'])

// The picker's presets. Those with a `preset` are the Period select's own, and applying one
// sets that rolling preset rather than a custom range, so the two controls agree.
const PICKER_PRESETS: ReadonlyArray<{ days: number; preset?: RollingPresetId }> = [
  { days: 7, preset: '7d' },
  { days: 14 },
  { days: 30, preset: '30d' },
  { days: 90, preset: '90d' },
]

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
  const lastDay = zonedDayOf(query.end - 1, timezone)
  const shown =
    period.preset !== CUSTOM_PERIOD && DAY_PRESETS.has(period.preset)
      ? daysEnding(lastDay, Math.round((query.end - query.start) / DAY))
      : { from: zonedDayOf(query.start, timezone), to: lastDay }
  const selected: DateRange = { from: toPickerDate(shown.from), to: toPickerDate(shown.to) }

  const onPreset = (value: string) => {
    const preset = PERIOD_PRESETS.find((p) => p.id === value)
    if (preset) state.setPreset(preset.id)
  }
  const onGranularity = (value: string) => {
    const granularity = state.allowed.find((g) => g === value)
    if (granularity) state.setGranularity(granularity)
  }
  const today = zonedDayOf(Date.now(), timezone)
  const presetRanges = PICKER_PRESETS.map(({ days, preset }) => ({
    days,
    preset,
    ...daysEnding(today, days),
  }))
  const pickerPresets: PresetItem[] = presetRanges.map(({ days, from, to }) => ({
    label: `Last ${days} days`,
    value: { from: toPickerDate(from), to: toPickerDate(to) },
  }))

  const onRange = (range: DateRange | undefined) => {
    if (range?.from && range.to) {
      const from = fromPickerDate(range.from)
      const to = fromPickerDate(range.to)
      const rolling = presetRanges.find((r) => r.preset && r.from === from && r.to === to)
      if (rolling?.preset) state.setPreset(rolling.preset)
      else state.setCustom(from, to)
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
        <DateRangePicker selected={selected} presets={pickerPresets} onSelect={onRange} />
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
              disabledReason: granularityDisabledReason(g, query.end - query.start),
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
