import { describe, expect, it } from 'vitest'

import {
  avg,
  calculateHashRevenueUSD,
  hsToPhs,
  mhsToPhs,
  safeNum,
  toPerPh,
  tsToISO,
  validateApiData,
  validateLogs,
  wToMw,
} from '../mining-utils'

describe('mining-utils', () => {
  describe('mhsToPhs', () => {
    it('converts MHS to PHS', () => {
      expect(mhsToPhs(1e9)).toBe(1)
      expect(mhsToPhs('500000000')).toBe(0.5)
    })
  })

  describe('wToMw', () => {
    it('converts watts to megawatts', () => {
      expect(wToMw(1e6)).toBe(1)
      expect(wToMw('2000000')).toBe(2)
    })
  })

  describe('hsToPhs', () => {
    it('converts H/s to PH/s', () => {
      expect(hsToPhs(1e15)).toBe(1)
    })
  })

  describe('safeNum', () => {
    it('returns number or default', () => {
      expect(safeNum(1)).toBe(1)
      expect(safeNum('2')).toBe(2)
      expect(safeNum(null, 5)).toBe(0) // Number(null) === 0, finite
      expect(safeNum(undefined, 5)).toBe(5)
      expect(safeNum(Number.NaN, 5)).toBe(5)
    })
  })

  describe('avg', () => {
    it('returns average of valid numbers', () => {
      expect(avg([1, 2, 3])).toBe(2)
      expect(avg([1, null, 3])).toBe(2)
      expect(avg([])).toBe(0)
    })
  })

  describe('tsToISO', () => {
    it('converts timestamp to ISO string', () => {
      expect(tsToISO(0)).toContain('1970')
      expect(tsToISO('1000')).toContain('1970')
    })
  })

  describe('toPerPh', () => {
    it('divides when denominator > 0', () => {
      expect(toPerPh(10, 2)).toBe(5)
      expect(toPerPh(10, 0)).toBe(0)
    })
  })

  describe('calculateHashRevenueUSD', () => {
    it('computes revenue from BTC and price', () => {
      expect(calculateHashRevenueUSD(1, 50000)).toBe(50000)
      expect(calculateHashRevenueUSD(0.5, '60000', 0)).toBe(30000)
    })
  })

  describe('validateApiData', () => {
    it('returns invalid for null/undefined', () => {
      expect(validateApiData(null)).toEqual({
        isValid: false,
        error: 'API data is null or undefined',
      })
      expect(validateApiData(undefined)).toEqual({
        isValid: false,
        error: 'API data is null or undefined',
      })
    })
    it('returns invalid when regions missing', () => {
      expect(validateApiData({})).toEqual({ isValid: false, error: 'No valid regions data' })
      expect(validateApiData({ regions: 'not-array' })).toEqual({
        isValid: false,
        error: 'No valid regions data',
      })
    })
    it('returns valid when regions is array', () => {
      expect(validateApiData({ regions: [] })).toEqual({ isValid: true })
    })
  })

  describe('validateLogs', () => {
    it('returns invalid for non-array or empty', () => {
      expect(validateLogs(null)).toEqual({ isValid: false, error: 'No valid logs data' })
      expect(validateLogs([])).toEqual({ isValid: false, error: 'No valid logs data' })
    })
    it('returns valid for non-empty array', () => {
      expect(validateLogs([1])).toEqual({ isValid: true })
    })
  })
})
