import {
  Button,
  cn,
  MultiLevelSelect,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@primitives'

import { monthsForYear, monthTreeToken, YEARS } from './timeframe-controls.helper'
import type { TimeframeControlsProps } from './timeframe-controls.types'
import {
  TimeframeWeekFlatContent,
  TimeframeWeekTreeContent,
} from './timeframe-controls-week-content'
import { useTimeframeControls } from './use-timeframe-controls'

import './timeframe-controls.scss'

/**
 * Date-range picker for financial reporting pages — supports year, month, and
 * week granularity via connected selects.
 *
 * @category filters
 * @domain financial-reporting
 * @kernelCapability financial-reporting
 * @tier agent-ready
 */
export const TimeframeControls = ({
  hint,
  onReset,
  dateRange,
  onRangeChange,
  layout = 'horizontal',
  onTimeframeTypeChange,
  showResetButton = false,
  isWeekSelectVisible = true,
  isMonthSelectVisible = true,
  timeframeType: timeframeTypeProp,
}: TimeframeControlsProps) => {
  const weekTree = isMonthSelectVisible && isWeekSelectVisible

  const {
    timezone,
    selectedYear,
    selectedMonth,
    visibleWeeks,
    handleYearChange,
    handleMonthTreeChange,
    handleWeekChangeFlat,
    handleWeekChangeFromTree,
    yearSelectValue,
    monthSelectValue,
    resolvedWeekValue,
  } = useTimeframeControls({
    dateRange,
    timeframeType: timeframeTypeProp,
    onRangeChange,
    onTimeframeTypeChange,
    isWeekSelectVisible,
    weekTree,
  })

  const banded = Boolean(hint)

  return (
    <div
      className={cn(
        'mdk-timeframe-controls',
        banded && 'mdk-timeframe-controls--banded',
        layout === 'stacked' && 'mdk-timeframe-controls--stacked',
      )}
    >
      {hint ? <p className="mdk-timeframe-controls__hint">{hint}</p> : null}
      <div
        className={cn(
          'mdk-timeframe-controls__toolbar',
          showResetButton && 'mdk-timeframe-controls__toolbar--with-reset',
        )}
      >
        <div className="mdk-timeframe-controls__selects">
          <div className="mdk-timeframe-controls__control">
            <Select value={yearSelectValue} onValueChange={handleYearChange}>
              <SelectTrigger className="mdk-timeframe-controls__control-target" aria-label="Year">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent className="mdk-timeframe-controls__select-content">
                {YEARS.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {String(y)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isMonthSelectVisible ? (
            <div className="mdk-timeframe-controls__control">
              <Select value={monthSelectValue} onValueChange={handleMonthTreeChange}>
                <SelectTrigger
                  className="mdk-timeframe-controls__control-target"
                  aria-label="Month"
                >
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent className="mdk-timeframe-controls__select-content mdk-timeframe-controls__multi-level-content">
                  {YEARS.map((year) => (
                    <MultiLevelSelect.Section
                      key={year}
                      sectionTitle={String(year)}
                      defaultOpen={year === selectedYear}
                    >
                      {[...monthsForYear(year)].reverse().map(({ month, label }) => (
                        <SelectItem key={`${year}-${month}`} value={monthTreeToken(year, month)}>
                          {label}
                        </SelectItem>
                      ))}
                    </MultiLevelSelect.Section>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {isWeekSelectVisible ? (
            <div className="mdk-timeframe-controls__control">
              <Select
                value={resolvedWeekValue}
                onValueChange={weekTree ? handleWeekChangeFromTree : handleWeekChangeFlat}
              >
                <SelectTrigger className="mdk-timeframe-controls__control-target" aria-label="Week">
                  <SelectValue placeholder="Week" />
                </SelectTrigger>
                <SelectContent
                  className={cn(
                    'mdk-timeframe-controls__select-content',
                    weekTree && 'mdk-timeframe-controls__multi-level-content',
                  )}
                >
                  {weekTree ? (
                    <TimeframeWeekTreeContent
                      timezone={timezone}
                      selectedYear={selectedYear}
                      selectedMonth={selectedMonth}
                    />
                  ) : (
                    <TimeframeWeekFlatContent visibleWeeks={visibleWeeks} />
                  )}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
        {showResetButton && (
          <Button
            type="button"
            variant="secondary"
            className="mdk-timeframe-controls__reset"
            onClick={onReset}
          >
            Reset
          </Button>
        )}
      </div>
    </div>
  )
}
