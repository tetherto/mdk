import { describe, expect, it } from 'vitest'
import {
  buildHashrateTailLogParams,
  buildMinerpoolStatsHistoryExtDataParams,
  buildSiteConsumptionTailLogParams,
  readHashrateMhs,
} from '../dashboard-queries'

describe('dashboard-queries', () => {
  describe('readHashrateMhs', () => {
    it('prefers the 1m aggregate', () => {
      expect(
        readHashrateMhs({ hashrate_mhs_1m_sum_aggr: 123, hashrate_mhs_5m_sum_aggr: 999 }),
      ).toBe(123)
    })
    it('falls back to the 5m aggregate', () => {
      expect(readHashrateMhs({ hashrate_mhs_5m_sum_aggr: 42 })).toBe(42)
    })
    it('returns undefined when neither field is a number', () => {
      expect(readHashrateMhs({})).toBeUndefined()
      expect(readHashrateMhs({ hashrate_mhs_1m_sum_aggr: 'oops' })).toBeUndefined()
    })
  })

  describe('buildHashrateTailLogParams', () => {
    it('emits the canonical t-miner / hashrate aggregate query', () => {
      const params = buildHashrateTailLogParams({ timeline: '5m', start: 100, end: 200 })
      expect(params).toMatchObject({
        key: 'stat-5m',
        type: 'miner',
        tag: 't-miner',
        limit: 288,
        start: 100,
        end: 200,
      })
      expect(JSON.parse(params.fields as string)).toEqual({ hashrate_mhs_1m_sum: 1 })
      expect(JSON.parse(params.aggrFields as string)).toEqual({ hashrate_mhs_1m_sum_aggr: 1 })
    })
    it('omits start/end when not provided', () => {
      const params = buildHashrateTailLogParams({ timeline: '1m' })
      expect(params.start).toBeUndefined()
      expect(params.end).toBeUndefined()
    })
  })

  describe('buildSiteConsumptionTailLogParams', () => {
    it('uses the powermeter tag + site_power_w aggregate', () => {
      const params = buildSiteConsumptionTailLogParams({ timeline: '3h', start: 1, end: 2 })
      expect(params).toMatchObject({
        key: 'stat-3h',
        type: 'powermeter',
        tag: 't-powermeter',
        limit: 288,
        start: 1,
        end: 2,
      })
      expect(JSON.parse(params.aggrFields as string)).toEqual({ site_power_w: 1 })
    })
  })

  describe('buildMinerpoolStatsHistoryExtDataParams', () => {
    it('includes start + end when provided', () => {
      const params = buildMinerpoolStatsHistoryExtDataParams({ start: 1000, end: 5000 })
      expect(params.type).toBe('minerpool')
      const q = JSON.parse(params.query as string)
      expect(q).toEqual({
        key: 'stats-history',
        start: 1000,
        end: 5000,
        fields: { ts: 1, 'stats.poolType': 1, 'stats.hashrate': 1 },
      })
    })
    it('omits start/end when not provided', () => {
      const params = buildMinerpoolStatsHistoryExtDataParams()
      const q = JSON.parse(params.query as string)
      expect(q).not.toHaveProperty('start')
      expect(q).not.toHaveProperty('end')
      expect(q.key).toBe('stats-history')
    })
    it('only omits start when end is provided alone', () => {
      const params = buildMinerpoolStatsHistoryExtDataParams({ end: 99 })
      const q = JSON.parse(params.query as string)
      expect(q.end).toBe(99)
      expect(q).not.toHaveProperty('start')
    })
  })
})
