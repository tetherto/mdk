/**
 * Runnable example for DashboardDateRangePicker.
 *
 * Demonstrates the `{ start, end }` timestamp shape — the same shape
 * `useDashboardDateRange` exposes from `@tetherto/mdk-react-adapter`.
 */
import { DashboardDateRangePicker } from '@tetherto/mdk-react-devkit'
import { useState } from 'react'

export const DashboardDateRangePickerExample = () => {
  const now = Date.now()
  const [range, setRange] = useState({
    start: now - 24 * 60 * 60 * 1000,
    end: now,
  })

  return <DashboardDateRangePicker value={range} onChange={setRange} />
}
