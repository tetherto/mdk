import * as React from 'react'
import { DayPicker } from 'react-day-picker'
import type { DayPickerProps } from 'react-day-picker'
import { CalendarIcon } from '@radix-ui/react-icons'
import { format } from 'date-fns'

import { cn } from '../../utils'
import { Button } from '../button'
import { Popover, PopoverContent, PopoverTrigger } from '../popover'

/**
 * DatePicker - Single date selection component
 * Built on react-day-picker with app dark theme styling
 *
 * @example
 * ```tsx
 * const [date, setDate] = useState<Date>()
 *
 * <DatePicker
 *   selected={date}
 *   onSelect={setDate}
 *   placeholder="Pick a date"
 * />
 * ```
 */
export type DatePickerProps = {
  /**
   * Currently selected date
   */
  selected?: Date
  /**
   * Callback when date changes
   */
  onSelect?: (date: Date | undefined) => void
  /**
   * Placeholder text when no date is selected
   * @default "Pick a date"
   */
  placeholder?: string
  /**
   * Date format for display
   * @default "MM/dd/yyyy"
   */
  dateFormat?: string
  /**
   * Whether the picker is disabled
   * @default false
   */
  disabled?: boolean
  /**
   * Custom className for the trigger button
   */
  triggerClassName?: string
  /**
   * Custom className for the calendar
   */
  calendarClassName?: string
} & Omit<DayPickerProps, 'mode' | 'selected' | 'onSelect'>

export const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(
  (
    {
      selected,
      onSelect,
      placeholder = 'Pick a date',
      dateFormat = 'MM/dd/yyyy',
      disabled = false,
      triggerClassName,
      calendarClassName,
      className,
      ...props
    },
    ref,
  ): React.JSX.Element => {
    const [open, setOpen] = React.useState(false)

    const handleSelect = (date: Date | undefined): void => {
      onSelect?.(date)
      setOpen(false)
    }

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            variant="secondary"
            className={cn('mdk-date-picker__trigger', triggerClassName)}
            disabled={disabled}
            icon={<CalendarIcon className="mdk-date-picker__icon" />}
          >
            {selected ? format(selected, dateFormat) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="mdk-date-picker__content" align="start">
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            className={cn('mdk-date-picker__calendar', calendarClassName, className)}
            {...props}
          />
        </PopoverContent>
      </Popover>
    )
  },
)
DatePicker.displayName = 'DatePicker'

/**
 * DateRangePicker - Date range selection component with presets
 * Inspired by app PresetDateRangePicker with modal interface
 *
 * @example
 * ```tsx
 * const [range, setRange] = useState<DateRange>()
 *
 * <DateRangePicker
 *   selected={range}
 *   onSelect={setRange}
 *   showPresets
 * />
 * ```
 */
export type DateRange = {
  from: Date | undefined
  to?: Date | undefined
}

export type PresetItem = {
  label: string
  value: DateRange
}

export type DateRangePickerProps = {
  /**
   * Selected date range
   */
  selected?: DateRange
  /**
   * Callback when date range changes
   */
  onSelect?: (range: DateRange | undefined) => void
  /**
   * Placeholder text when no range is selected
   * @default "Pick a date range"
   */
  placeholder?: string
  /**
   * Date format for display
   * @default "MM/dd/yyyy"
   */
  dateFormat?: string
  /**
   * Whether the picker is disabled
   * @default false
   */
  disabled?: boolean
  /**
   * Whether to show preset buttons
   * @default true
   */
  showPresets?: boolean
  /**
   * Custom preset items
   */
  presets?: PresetItem[]
  /**
   * Whether to allow future dates
   * @default false
   */
  allowFutureDates?: boolean
  /**
   * Custom className for the trigger button
   */
  triggerClassName?: string
  /**
   * Custom className for the calendar
   */
  calendarClassName?: string
  /**
   * Custom className for the modal
   */
  modalClassName?: string
} & Omit<DayPickerProps, 'mode' | 'selected'>

// Default preset items (matching app)
const getDefaultPresets = (): PresetItem[] => {
  const today = new Date()
  const addDays = (date: Date, days: number): Date => {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
  }

  return [
    {
      label: 'Last 7 Days',
      value: { from: addDays(today, -7), to: today },
    },
    {
      label: 'Last 14 Days',
      value: { from: addDays(today, -14), to: today },
    },
    {
      label: 'Last 30 Days',
      value: { from: addDays(today, -30), to: today },
    },
    {
      label: 'Last 90 Days',
      value: { from: addDays(today, -90), to: today },
    },
  ]
}

export const DateRangePicker = React.forwardRef<HTMLButtonElement, DateRangePickerProps>(
  (
    {
      selected,
      onSelect,
      placeholder = 'Pick a date range',
      dateFormat = 'MM/dd/yyyy',
      disabled = false,
      showPresets = true,
      presets,
      allowFutureDates = false,
      triggerClassName,
      calendarClassName,
      modalClassName,
      className,
      ...props
    },
    ref,
  ): React.JSX.Element => {
    const [open, setOpen] = React.useState(false)
    const [draftRange, setDraftRange] = React.useState<DateRange | undefined>(selected)

    // Sync draft with external changes
    React.useEffect(() => {
      if (!open) {
        setDraftRange(selected)
      }
    }, [selected, open])

    const presetItems = presets ?? (showPresets ? getDefaultPresets() : [])

    const handleSelect = (range: DateRange | undefined): void => {
      setDraftRange(range)
    }

    const handleApply = (): void => {
      onSelect?.(draftRange)
      setOpen(false)
    }

    const handleClear = (): void => {
      setDraftRange(undefined)
    }

    const handlePresetClick = (preset: PresetItem): void => {
      setDraftRange(preset.value)
    }

    // Check if a preset is active
    const isPresetActive = (preset: PresetItem): boolean => {
      if (!draftRange?.from || !draftRange?.to) return false
      const threshold = 5 * 60 * 1000 // 5 minutes in ms
      const fromDiff = Math.abs(draftRange.from.getTime() - preset.value.from!.getTime())
      const toDiff = Math.abs(draftRange.to.getTime() - preset.value.to!.getTime())
      return fromDiff < threshold && toDiff < threshold
    }

    const displayText = React.useMemo(() => {
      if (!selected?.from) return placeholder
      if (!selected.to) return format(selected.from, dateFormat)
      return `${format(selected.from, dateFormat)} - ${format(selected.to, dateFormat)}`
    }, [selected, dateFormat, placeholder])

    // Calculate disabled days
    const getDisabledDays = (): DayPickerProps['disabled'] => {
      if (!allowFutureDates) {
        return { after: new Date() }
      }
      return undefined
    }

    // Calculate days selected
    const daysSelected = React.useMemo(() => {
      if (!draftRange?.from || !draftRange?.to) return 0
      const diff = draftRange.to.getTime() - draftRange.from.getTime()
      return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1
    }, [draftRange])

    const isRangeComplete = draftRange?.from && draftRange?.to

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            variant="secondary"
            className={cn('mdk-date-picker__trigger', triggerClassName)}
            disabled={disabled}
            icon={<CalendarIcon className="mdk-date-picker__icon" />}
          >
            <span className="mdk-date-picker__text">{displayText}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className={cn('mdk-date-picker__modal', modalClassName)}
          align="start"
          collisionPadding={16}
          sideOffset={8}
        >
          <div className="mdk-date-picker__modal-header">
            <h3 className="mdk-date-picker__modal-title">Select Date Range</h3>
          </div>

          <div className="mdk-date-picker__modal-body">
            <div className="mdk-date-picker__calendar-container">
              <DayPicker
                mode="range"
                selected={draftRange}
                onSelect={handleSelect}
                numberOfMonths={2}
                disabled={getDisabledDays()}
                className={cn('mdk-date-picker__calendar', calendarClassName, className)}
                {...props}
              />
            </div>

            <div className="mdk-date-picker__meta">
              {isRangeComplete && (
                <div className="mdk-date-picker__summary">
                  <div className="mdk-date-picker__summary-title">Selected Range</div>
                  <div className="mdk-date-picker__summary-dates">
                    <span className="mdk-date-picker__summary-date">
                      {format(draftRange.from!, 'dd MMM yyyy')}
                    </span>
                    <span>to</span>
                    <span className="mdk-date-picker__summary-date">
                      {format(draftRange.to!, 'dd MMM yyyy')}
                    </span>
                  </div>
                  <div className="mdk-date-picker__summary-count">{daysSelected} days selected</div>
                </div>
              )}

              {presetItems.length > 0 && (
                <div className="mdk-date-picker__presets">
                  {presetItems.map((preset) => (
                    <Button
                      key={preset.label}
                      variant={isPresetActive(preset) ? 'primary' : 'secondary'}
                      onClick={() => handlePresetClick(preset)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mdk-date-picker__modal-footer">
            <Button variant="secondary" onClick={handleClear}>
              Clear Selection
            </Button>
            <Button variant="primary" onClick={handleApply} disabled={!isRangeComplete}>
              Apply Range
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    )
  },
)
DateRangePicker.displayName = 'DateRangePicker'
