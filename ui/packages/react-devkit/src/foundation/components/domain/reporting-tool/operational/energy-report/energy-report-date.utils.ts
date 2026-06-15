import { endOfDay } from 'date-fns/endOfDay'
import { startOfDay } from 'date-fns/startOfDay'
import { subDays } from 'date-fns/subDays'

import type { EnergyReportDateRange } from './energy-report.constants'
import { DEFAULT_SITE_RANGE_DAYS } from './energy-report.constants'

/** Last N full days ending yesterday (matches Moria Energy report default). */
export const getEnergyReportDefaultDateRange = (): EnergyReportDateRange => {
  const yesterday = subDays(new Date(), 1)

  return {
    start: startOfDay(subDays(yesterday, DEFAULT_SITE_RANGE_DAYS - 1)).getTime(),
    end: endOfDay(yesterday).getTime(),
  }
}
