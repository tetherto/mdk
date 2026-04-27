import { describe, expect, it } from 'vitest'
import { DATE_RANGE } from '../../../../../constants'
import {
  CHART_MIN_HEIGHT,
  MINER_AGGR_FIELDS,
  MINER_FIELDS,
  MS_PER_DAY,
  MS_PER_HOUR,
  MS_PER_MINUTE,
  TIMELINE_DAILY_THRESHOLDS,
  TIMELINE_INTERVAL_MS,
  TIMELINE_THRESHOLDS_KV_PAIRS,
  TIMELINE_TO_THRESHOLD_KEY,
} from '../hash-rate-line-chart-with-pool/hash-rate-line-chart-with-pool-constants'

describe('constants', () => {
  describe('MINER_FIELDS / MINER_AGGR_FIELDS', () => {
    it('MINER_FIELDS is valid JSON', () => {
      expect(() => JSON.parse(MINER_FIELDS)).not.toThrow()
    })

    it('MINER_FIELDS contains hashrate_mhs_1m_sum key', () => {
      expect(JSON.parse(MINER_FIELDS)).toEqual({ hashrate_mhs_1m_sum: 1 })
    })

    it('MINER_AGGR_FIELDS is valid JSON', () => {
      expect(() => JSON.parse(MINER_AGGR_FIELDS)).not.toThrow()
    })

    it('MINER_AGGR_FIELDS contains hashrate_mhs_1m_sum_aggr key', () => {
      expect(JSON.parse(MINER_AGGR_FIELDS)).toEqual({ hashrate_mhs_1m_sum_aggr: 1 })
    })
  })

  describe('time constants', () => {
    it('CHART_MIN_HEIGHT is 350', () => {
      expect(CHART_MIN_HEIGHT).toBe(350)
    })

    it('MS_PER_MINUTE is 60_000', () => {
      expect(MS_PER_MINUTE).toBe(60_000)
    })

    it('MS_PER_HOUR is 60 * MS_PER_MINUTE', () => {
      expect(MS_PER_HOUR).toBe(60 * MS_PER_MINUTE)
    })

    it('MS_PER_HOUR is 3_600_000', () => {
      expect(MS_PER_HOUR).toBe(3_600_000)
    })

    it('MS_PER_DAY is 24 * MS_PER_HOUR', () => {
      expect(MS_PER_DAY).toBe(24 * MS_PER_HOUR)
    })

    it('MS_PER_DAY is 86_400_000', () => {
      expect(MS_PER_DAY).toBe(86_400_000)
    })
  })

  describe('TIMELINE_DAILY_THRESHOLDS', () => {
    it('D1 threshold is 30', () => {
      expect(TIMELINE_DAILY_THRESHOLDS.D1).toBe(30)
    })

    it('H3 threshold is 7', () => {
      expect(TIMELINE_DAILY_THRESHOLDS.H3).toBe(7)
    })

    it('M30 threshold is 2', () => {
      expect(TIMELINE_DAILY_THRESHOLDS.M30).toBe(2)
    })

    it('M5 threshold is 0', () => {
      expect(TIMELINE_DAILY_THRESHOLDS.M5).toBe(0)
    })

    it('thresholds are in descending order', () => {
      const values = [
        TIMELINE_DAILY_THRESHOLDS.D1!,
        TIMELINE_DAILY_THRESHOLDS.H3!,
        TIMELINE_DAILY_THRESHOLDS.M30!,
        TIMELINE_DAILY_THRESHOLDS.M5!,
      ]
      expect(values).toEqual([...values].sort((a, b) => b - a))
    })
  })

  describe('TIMELINE_TO_THRESHOLD_KEY', () => {
    it('maps M5 timeline to M5 key', () => {
      expect(TIMELINE_TO_THRESHOLD_KEY[DATE_RANGE.M5]).toBe('M5')
    })

    it('maps M30 timeline to M30 key', () => {
      expect(TIMELINE_TO_THRESHOLD_KEY[DATE_RANGE.M30]).toBe('M30')
    })

    it('maps H3 timeline to H3 key', () => {
      expect(TIMELINE_TO_THRESHOLD_KEY[DATE_RANGE.H3]).toBe('H3')
    })

    it('maps D1 timeline to D1 key', () => {
      expect(TIMELINE_TO_THRESHOLD_KEY[DATE_RANGE.D1]).toBe('D1')
    })

    it('covers all four timeline values', () => {
      expect(Object.keys(TIMELINE_TO_THRESHOLD_KEY)).toHaveLength(4)
    })

    it('all values are valid DateRangeKeys', () => {
      const validKeys = ['M5', 'M30', 'H3', 'D1']
      Object.values(TIMELINE_TO_THRESHOLD_KEY).forEach((key) => {
        expect(validKeys).toContain(key)
      })
    })
  })

  describe('TIMELINE_INTERVAL_MS', () => {
    it('M5 interval is 5 minutes in ms', () => {
      expect(TIMELINE_INTERVAL_MS[DATE_RANGE.M5]).toBe(5 * MS_PER_MINUTE)
    })

    it('M30 interval is 30 minutes in ms', () => {
      expect(TIMELINE_INTERVAL_MS[DATE_RANGE.M30]).toBe(30 * MS_PER_MINUTE)
    })

    it('H3 interval is 3 hours in ms', () => {
      expect(TIMELINE_INTERVAL_MS[DATE_RANGE.H3]).toBe(3 * MS_PER_HOUR)
    })

    it('D1 interval is 24 hours in ms', () => {
      expect(TIMELINE_INTERVAL_MS[DATE_RANGE.D1]).toBe(24 * MS_PER_HOUR)
    })

    it('intervals are in ascending order', () => {
      const values = [
        TIMELINE_INTERVAL_MS[DATE_RANGE.M5],
        TIMELINE_INTERVAL_MS[DATE_RANGE.M30],
        TIMELINE_INTERVAL_MS[DATE_RANGE.H3],
        TIMELINE_INTERVAL_MS[DATE_RANGE.D1],
      ]
      expect(values).toEqual([...values].sort((a, b) => a - b))
    })

    it('covers all four timeline values', () => {
      expect(Object.keys(TIMELINE_INTERVAL_MS)).toHaveLength(4)
    })
  })

  describe('TIMELINE_THRESHOLDS_KV_PAIRS', () => {
    it('is an array', () => {
      expect(Array.isArray(TIMELINE_THRESHOLDS_KV_PAIRS)).toBe(true)
    })

    it('has the same length as TIMELINE_DAILY_THRESHOLDS', () => {
      expect(TIMELINE_THRESHOLDS_KV_PAIRS).toHaveLength(
        Object.keys(TIMELINE_DAILY_THRESHOLDS).length,
      )
    })

    it('each entry is a [key, value] pair', () => {
      TIMELINE_THRESHOLDS_KV_PAIRS.forEach(([key, value]) => {
        expect(typeof key).toBe('string')
        expect(typeof value).toBe('number')
      })
    })

    it('contains the D1 entry', () => {
      expect(TIMELINE_THRESHOLDS_KV_PAIRS).toContainEqual(['D1', 30])
    })

    it('contains the H3 entry', () => {
      expect(TIMELINE_THRESHOLDS_KV_PAIRS).toContainEqual(['H3', 7])
    })

    it('contains the M30 entry', () => {
      expect(TIMELINE_THRESHOLDS_KV_PAIRS).toContainEqual(['M30', 2])
    })

    it('contains the M5 entry', () => {
      expect(TIMELINE_THRESHOLDS_KV_PAIRS).toContainEqual(['M5', 0])
    })

    it('is derived from TIMELINE_DAILY_THRESHOLDS entries', () => {
      expect(TIMELINE_THRESHOLDS_KV_PAIRS).toEqual(Object.entries(TIMELINE_DAILY_THRESHOLDS))
    })
  })
})
