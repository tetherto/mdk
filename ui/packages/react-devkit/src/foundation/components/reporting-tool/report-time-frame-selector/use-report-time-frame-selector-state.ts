import { endOfDay } from 'date-fns/endOfDay'
import { endOfYesterday } from 'date-fns/endOfYesterday'
import { startOfDay } from 'date-fns/startOfDay'
import { startOfYesterday } from 'date-fns/startOfYesterday'
import { sub } from 'date-fns/sub'
import { useState } from 'react'

export type ReportTimeFrameSelectorState = {
  start: Date
  end: Date
  presetTimeFrame: number | null
  dateRange: [Date, Date]
  setPresetTimeFrame: (value: number | null) => void
  setDateRange: (value: [Date, Date]) => void
}

/**
 * State hook backing the reporting time-frame selector — exposes the active window and setters.
 *
 * @category filters
 * @domain financial-reporting
 * @orkCapability financial-reporting
 * @tier agent-ready
 */
export const useReportTimeFrameSelectorState = (): ReportTimeFrameSelectorState => {
  const [presetTimeFrame, setPresetTimeFrame] = useState<number | null>(1)
  const [dateRange, setDateRange] = useState<[Date, Date]>([
    startOfDay(sub(startOfYesterday(), { months: 1 })),
    endOfYesterday(),
  ])

  const [start, end] = (() => {
    if (presetTimeFrame !== null) {
      return [sub(startOfYesterday(), { days: presetTimeFrame - 1 }), endOfYesterday()]
    }
    return [startOfDay(dateRange[0]), endOfDay(dateRange[1])]
  })()

  return { start, end, presetTimeFrame, dateRange, setPresetTimeFrame, setDateRange }
}
