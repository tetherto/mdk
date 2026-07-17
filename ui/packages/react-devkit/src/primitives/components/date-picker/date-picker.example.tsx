/**
 * Runnable example for DatePicker and DateRangePicker.
 */
import { useState } from 'react'
import type { DateRange } from '@tetherto/mdk-react-devkit'
import { DatePicker, DateRangePicker } from '@tetherto/mdk-react-devkit'

export const DatePickerExample = () => {
  const [date, setDate] = useState<Date>()
  const [range, setRange] = useState<DateRange>()

  return (
    <div className="mdk-example-row">
      <DatePicker selected={date} onSelect={setDate} />
      <DateRangePicker selected={range} onSelect={setRange} showPresets />
    </div>
  )
}
