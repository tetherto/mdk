import { endOfDay } from 'date-fns/endOfDay'
import { startOfDay } from 'date-fns/startOfDay'
import { subDays } from 'date-fns/subDays'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_SITE_RANGE_DAYS } from '../energy-report.constants'
import { getEnergyReportDefaultDateRange } from '../energy-report-date.utils'

describe('getEnergyReportDefaultDateRange', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-29T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns last N full days ending yesterday', () => {
    const range = getEnergyReportDefaultDateRange()
    const yesterday = subDays(new Date(), 1)
    const expectedStart = startOfDay(
      subDays(yesterday, DEFAULT_SITE_RANGE_DAYS - 1),
    ).getTime()
    const expectedEnd = endOfDay(yesterday).getTime()

    expect(range.start).toBe(expectedStart)
    expect(range.end).toBe(expectedEnd)
    expect(range.end).toBeGreaterThan(range.start)
  })
})
