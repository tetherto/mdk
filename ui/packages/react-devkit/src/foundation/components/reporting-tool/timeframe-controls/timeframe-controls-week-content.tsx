import { MultiLevelSelect, SelectItem } from '@core'

import { monthsForYear, weeksOfMonth, weekTreeToken, YEARS } from './timeframe-controls.helper'

export type TimeframeWeekTreeContentProps = {
  timezone: string
  selectedYear: number
  selectedMonth: number
}

/**
 * Hierarchical year → month → week tree for the TimeframeControls week selector.
 *
 * @category filters
 * @domain financial-reporting
 * @orkCapability financial-reporting
 * @tier agent-ready
 */
export const TimeframeWeekTreeContent = ({
  timezone,
  selectedYear,
  selectedMonth,
}: TimeframeWeekTreeContentProps) =>
  YEARS.map((year) => (
    <MultiLevelSelect.Section
      key={year}
      sectionTitle={String(year)}
      defaultOpen={year === selectedYear}
    >
      {monthsForYear(year).map(({ month, label }) => (
        <MultiLevelSelect.Section
          key={`${year}-${month}`}
          sectionTitle={label}
          defaultOpen={year === selectedYear && month === selectedMonth}
        >
          {weeksOfMonth(year, month, timezone).map((w) => (
            <SelectItem
              key={`${year}-${month}-${w.start.getTime()}`}
              value={weekTreeToken(year, month, w.start)}
              disabled={Boolean(w.disabled)}
            >
              {w.label}
            </SelectItem>
          ))}
        </MultiLevelSelect.Section>
      ))}
    </MultiLevelSelect.Section>
  ))

export type TimeframeWeekFlatContentProps = {
  visibleWeeks: ReturnType<typeof weeksOfMonth>
}

/**
 * Flat list of selectable week items for the TimeframeControls week selector.
 *
 * @category filters
 * @domain financial-reporting
 * @orkCapability financial-reporting
 * @tier agent-ready
 */
export const TimeframeWeekFlatContent = ({ visibleWeeks }: TimeframeWeekFlatContentProps) =>
  visibleWeeks.map((week) => (
    <SelectItem
      key={week.start.getTime()}
      value={String(week.start.getTime())}
      disabled={Boolean(week.disabled)}
    >
      {week.label}
    </SelectItem>
  ))
