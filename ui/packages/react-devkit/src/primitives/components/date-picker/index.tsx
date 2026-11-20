import { DayPicker } from 'react-day-picker'
import type { DayPickerProps } from 'react-day-picker'
import { CalendarIcon } from '@radix-ui/react-icons'
import { format } from 'date-fns'

import { cn } from '../../utils'
import { Button } from '../button'
import { Dialog, DialogContent, DialogTrigger } from '../dialog'
import { Popover, PopoverContent, PopoverTrigger } from '../popover'
import { forwardRef, type JSX, useEffect, useMemo, useState } from 'react'

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

/**
 * Single-date selection component built on react-day-picker with the MDK
 * dark theme. Controlled via `selected` / `onSelect`.
 *
 * @category forms
 * @domain generic
 * @tier agent-ready
 *
 * @example
 * ```tsx
 * const [date, setDate] = useState<Date>()
 * <DatePicker selected={date} onSelect={setDate} placeholder="Pick a date" />
 * ```
 */
export const DatePicker = forwardRef<HTMLButtonElement, DatePickerProps>(
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
  ): JSX.Element => {
    const [open, setOpen] = useState(false)

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
            defaultMonth={selected}
            fixedWeeks
            className={cn('mdk-date-picker__calendar', calendarClassName, className)}
            {...props}
          />
        </PopoverContent>
      </Popover>
    )
  },
)
DatePicker.displayName = 'DatePicker'

export type DateRange = {
  /** Range start; `undefined` means nothing is selected and the placeholder shows */
  from: Date | undefined
  /** Range end; while unset the trigger shows `from` alone and Apply stays disabled */
  to?: Date | undefined
}

export type PresetItem = {
  /** Preset button text; also used as the React key, so keep it unique */
  label: string
  /** Range applied to the draft on click; needs both `from` and `to`. Highlighted when the draft is within 5 minutes of it at both ends */
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

// Default preset items: "Last 7 Days" is the 7 whole days ending today (today and the six days before it)
const getDefaultPresets = (): PresetItem[] => {
  const today = new Date()
  const daysEnding = (days: number): { from: Date; to: Date } => {
    const from = new Date(today)
    from.setDate(from.getDate() - (days - 1))
    return { from, to: today }
  }

  return [7, 14, 30, 90].map((days) => ({
    label: `Last ${days} Days`,
    value: daysEnding(days),
  }))
}

/**
 * Date-range selection component with preset shortcuts (last 7/14/30/90
 * days) in a centered modal over a blurred overlay, closed with ✕, Escape or
 * the overlay (which discard the draft). Controlled via `selected` / `onSelect`.
 *
 * @category forms
 * @domain generic
 * @tier agent-ready
 *
 * @example
 * ```tsx
 * const [range, setRange] = useState<DateRange>()
 * <DateRangePicker selected={range} onSelect={setRange} showPresets />
 * ```
 */
export const DateRangePicker = forwardRef<HTMLButtonElement, DateRangePickerProps>(
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
  ): JSX.Element => {
    const [open, setOpen] = useState(false)
    const [draftRange, setDraftRange] = useState<DateRange | undefined>(selected)
    // The first month shown: the selected range's on open, a preset's once one is clicked
    const [month, setMonth] = useState<Date | undefined>(props.defaultMonth ?? selected?.from)

    const handleOpenChange = (next: boolean): void => {
      if (next) setMonth(props.defaultMonth ?? selected?.from)
      setOpen(next)
    }

    // Sync draft with external changes
    useEffect(() => {
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
      if (preset.value.from) setMonth(preset.value.from)
    }

    // Check if a preset is active
    const isPresetActive = (preset: PresetItem): boolean => {
      if (!draftRange?.from || !draftRange?.to) return false
      const threshold = 5 * 60 * 1000 // 5 minutes in ms
      const fromDiff = Math.abs(draftRange.from.getTime() - preset.value.from!.getTime())
      const toDiff = Math.abs(draftRange.to.getTime() - preset.value.to!.getTime())
      return fromDiff < threshold && toDiff < threshold
    }

    const displayText = useMemo(() => {
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
    const daysSelected = useMemo(() => {
      if (!draftRange?.from || !draftRange?.to) return 0
      const diff = draftRange.to.getTime() - draftRange.from.getTime()
      return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1
    }, [draftRange])

    const isRangeComplete = draftRange?.from && draftRange?.to

    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button
            ref={ref}
            variant="secondary"
            className={cn('mdk-date-picker__trigger', triggerClassName)}
            disabled={disabled}
            icon={<CalendarIcon className="mdk-date-picker__icon" />}
          >
            <span className="mdk-date-picker__text">{displayText}</span>
          </Button>
        </DialogTrigger>
        {/* Closing with ✕, Escape or the overlay discards the draft: it resyncs to `selected`
            once `open` is false */}
        <DialogContent
          title="Select Date Range"
          closable
          onClose={() => setOpen(false)}
          className={cn('mdk-date-picker__modal', modalClassName)}
          overlayClassName="mdk-date-picker__overlay"
        >

          <div className="mdk-date-picker__modal-body">
            <div className="mdk-date-picker__calendar-container">
              <DayPicker
                mode="range"
                selected={draftRange}
                onSelect={handleSelect}
                numberOfMonths={2}
                fixedWeeks
                disabled={getDisabledDays()}
                className={cn('mdk-date-picker__calendar', calendarClassName, className)}
                {...props}
                month={props.month ?? month}
                onMonthChange={(next) => {
                  setMonth(next)
                  props.onMonthChange?.(next)
                }}
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
        </DialogContent>
      </Dialog>
    )
  },
)
DateRangePicker.displayName = 'DateRangePicker'
