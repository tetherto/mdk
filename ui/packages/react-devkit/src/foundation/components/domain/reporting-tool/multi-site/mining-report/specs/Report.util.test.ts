import { describe, expect, it } from 'vitest'

import {
  API_DATE_FORMAT,
  DATE_FORMAT,
  formatDateForFilename,
  getMonthYear,
  getPeriod,
  makeLabelFormatter,
  parseDateRange,
  PERIOD_MAP,
  pickLogs,
  sanitizeFileName,
} from '../mining-report.util'

describe('Report.util', () => {
  describe('PERIOD_MAP', () => {
    it('maps weekly to daily, monthly to daily, yearly to monthly', () => {
      expect(PERIOD_MAP.weekly).toBe('daily')
      expect(PERIOD_MAP.monthly).toBe('daily')
      expect(PERIOD_MAP.yearly).toBe('monthly')
    })
  })

  describe('DATE_FORMAT and API_DATE_FORMAT', () => {
    it('exports expected format strings', () => {
      expect(DATE_FORMAT).toBe('MMM dd, yyyy')
      expect(API_DATE_FORMAT).toBe('yyyy-MM-dd')
    })
  })

  describe('sanitizeFileName', () => {
    it('lowercases and replaces spaces with hyphens', () => {
      expect(sanitizeFileName('Site One')).toBe('site-one')
    })

    it('handles multiple spaces by replacing each run with single hyphen', () => {
      expect(sanitizeFileName('A  B   C')).toBe('a-b-c')
    })
  })

  describe('parseDateRange', () => {
    it('returns startDate and endDate in API format for valid range', () => {
      const result = parseDateRange('Jan 01, 2024 - Dec 31, 2024')
      expect(result).toHaveProperty('startDate')
      expect(result).toHaveProperty('endDate')
      expect(result.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(result.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('returns fallback dates on parse error', () => {
      const result = parseDateRange('invalid')
      expect(result.startDate).toBeDefined()
      expect(result.endDate).toBeDefined()
    })
  })

  describe('getMonthYear', () => {
    it('returns monthName and year for valid date range string', () => {
      const result = getMonthYear('Jan 15 - Jan 20, 2024')
      expect(result.monthName).toBeDefined()
      expect(result.year).toBe(2024)
    })

    it('returns empty strings when no year part', () => {
      const result = getMonthYear('Jan 15')
      expect(result).toEqual({ monthName: '', year: '' })
    })
  })

  describe('formatDateForFilename', () => {
    it('returns formatted date range or date-unknown', () => {
      const result = formatDateForFilename('Jan 01, 2024 - Dec 31, 2024')
      expect(result).toMatch(/^\d{8}-\d{8}$|^date-unknown$/)
    })
  })

  describe('getPeriod', () => {
    it('returns api.period when present', () => {
      expect(getPeriod({ period: 'weekly' } as never)).toBe('weekly')
    })

    it('returns period from regions[0].log[0] when api.period missing', () => {
      expect(getPeriod({ regions: [{ log: [{ period: 'monthly' }] }] } as never)).toBe('monthly')
    })

    it('returns period from data.log[0] when regions path missing', () => {
      expect(getPeriod({ data: { log: [{ period: 'yearly' }] } } as never)).toBe('yearly')
    })

    it('returns "daily" when no period found', () => {
      expect(getPeriod(undefined)).toBe('daily')
      expect(getPeriod({} as never)).toBe('daily')
    })
  })

  describe('makeLabelFormatter', () => {
    it('returns function that formats timestamp', () => {
      const formatter = makeLabelFormatter('daily')
      expect(typeof formatter).toBe('function')
      const formatted = formatter(Date.now())
      expect(typeof formatted).toBe('string')
    })

    it('returns monthly format when period is monthly', () => {
      const formatter = makeLabelFormatter('monthly')
      const formatted = formatter(new Date('2024-06-15').getTime())
      expect(formatted).toMatch(/\d{2}-\d{2}/)
    })
  })

  describe('pickLogs', () => {
    it('filters by regionFilter when provided', () => {
      const api = {
        regions: [
          { region: 'r1', log: [{ ts: 1 }] },
          { region: 'r2', log: [{ ts: 2 }] },
        ],
      }
      const result = pickLogs(api as never, ['r1'])
      expect(result.logsPerSource).toHaveLength(1)
      expect(result.period).toBeDefined()
    })

    it('uses api.data.log when present and no regionFilter', () => {
      const api = { data: { log: [{ ts: 1 }] } }
      const result = pickLogs(api as never)
      expect(result.logsPerSource).toEqual([[{ ts: 1 }]])
    })

    it('returns regions logs when no data.log and no regionFilter', () => {
      const api = { regions: [{ region: 'r1', log: [] }] }
      const result = pickLogs(api as never)
      expect(result.logsPerSource).toHaveLength(1)
      expect(result.logsPerSource[0]).toEqual([])
    })
  })
})
