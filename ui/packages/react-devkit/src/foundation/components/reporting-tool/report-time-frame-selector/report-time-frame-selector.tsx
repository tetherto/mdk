import type { DateRange } from '@core'
import { DateRangePicker, RadioCard, RadioGroup } from '@core'
import { endOfDay } from 'date-fns/endOfDay'
import { startOfDay } from 'date-fns/startOfDay'
import type { ReportTimeFrameSelectorState } from './use-report-time-frame-selector-state'
import './report-time-frame-selector.scss'

const PRESET_OPTIONS = [
  { label: '1D', value: 1 },
  { label: '7D', value: 7 },
  { label: '30D', value: 30 },
]

const CUSTOM = 'custom'

export type ReportTimeFrameSelectorProps = Pick<
  ReportTimeFrameSelectorState,
  'presetTimeFrame' | 'dateRange' | 'setPresetTimeFrame' | 'setDateRange'
>

/**
 * Reporting-period selector with preset windows (7d / 30d / month-to-date / custom range).
 *
 * @category filters
 * @domain financial-reporting
 * @orkCapability financial-reporting
 * @tier agent-ready
 */
export const ReportTimeFrameSelector = ({
  presetTimeFrame,
  dateRange,
  setPresetTimeFrame,
  setDateRange,
}: ReportTimeFrameSelectorProps) => {
  const radioValue = presetTimeFrame === null ? CUSTOM : String(presetTimeFrame)

  const handleValueChange = (value: string) => {
    setPresetTimeFrame(value === CUSTOM ? null : Number(value))
  }

  const handleDateRangeSelect = (selected: DateRange | undefined) => {
    if (!selected?.from) return
    setDateRange([startOfDay(selected.from), endOfDay(selected.to ?? selected.from)])
  }

  return (
    <div className="mdk-report-time-frame-selector">
      <RadioGroup
        value={radioValue}
        onValueChange={handleValueChange}
        orientation="horizontal"
        noGap
      >
        {PRESET_OPTIONS.map(({ label, value }) => (
          <RadioCard key={value} value={String(value)} label={label} />
        ))}
        <RadioCard value={CUSTOM} label="Custom" />
      </RadioGroup>
      {presetTimeFrame === null && (
        <DateRangePicker
          selected={{ from: dateRange[0], to: dateRange[1] }}
          onSelect={handleDateRangeSelect}
        />
      )}
    </div>
  )
}
