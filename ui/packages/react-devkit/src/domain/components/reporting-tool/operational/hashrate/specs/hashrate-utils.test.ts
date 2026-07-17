import { describe, expect, it } from 'vitest'

import type { HashrateGroupedLog } from '../hashrate.types'
import {
  getMinerTypeOptionsFromLog,
  getMiningUnitOptionsFromLog,
  transformToMinerTypeBarData,
  transformToMiningUnitBarData,
  transformToSiteViewData,
} from '../hashrate-utils'

const minerLog: HashrateGroupedLog = [
  {
    ts: 1701388800000,
    hashrateMhs: { 'miner-am-s19xp': 5_000_000, 'miner-wm-m56s': 3_000_000, 'miner-av-a1346': 0 },
  },
  {
    ts: 1701475200000,
    hashrateMhs: { 'miner-am-s19xp': 5_500_000, 'miner-wm-m56s': 3_200_000, 'miner-av-a1346': 0 },
  },
]

const containerLog: HashrateGroupedLog = [
  {
    ts: 1701388800000,
    hashrateMhs: {
      'bitdeer-1a': 4_000_000,
      'bitdeer-4a': 2_000_000,
      maintenance: 0,
      'group-1': 1_111_111,
      'group-7': 99_999_999,
    },
  },
  {
    ts: 1701475200000,
    hashrateMhs: {
      'bitdeer-1a': 4_200_000,
      'bitdeer-4a': 2_100_000,
      maintenance: 0,
      'group-1': 1_111_111,
      'group-7': 99_999_999,
    },
  },
]

describe('hashrate-utils', () => {
  describe('transformToSiteViewData', () => {
    it('returns empty series when log is missing or empty', () => {
      expect(transformToSiteViewData(undefined)).toEqual({ series: [] })
      expect(transformToSiteViewData([])).toEqual({ series: [] })
    })

    it('sums all miner types per timestamp and converts MH/s to TH/s', () => {
      const result = transformToSiteViewData(minerLog)
      expect(result.series).toHaveLength(1)
      expect(result.series[0]?.label).toBe('Site Hashrate')
      expect(result.series[0]?.points[0]?.value).toBe(8)
      expect(result.series[0]?.points[1]?.value).toBe(8.7)
    })

    it('filters by selected miner types when provided', () => {
      const result = transformToSiteViewData(minerLog, ['miner-am-s19xp'])
      expect(result.series[0]?.points[0]?.value).toBe(5)
      expect(result.series[0]?.points[1]?.value).toBe(5.5)
    })

    it('sorts points by timestamp ascending', () => {
      const reversed = [...minerLog].reverse()
      const result = transformToSiteViewData(reversed)
      const t1 = new Date(result.series[0]?.points[0]?.ts ?? 0).getTime()
      const t2 = new Date(result.series[0]?.points[1]?.ts ?? 0).getTime()
      expect(t1).toBeLessThan(t2)
    })
  })

  describe('transformToMinerTypeBarData', () => {
    it('returns empty data when log is missing or empty', () => {
      expect(transformToMinerTypeBarData(undefined)).toEqual({ labels: [], series: [] })
      expect(transformToMinerTypeBarData([])).toEqual({ labels: [], series: [] })
    })

    it('uses the latest log entry, sorts desc, drops zero values, and maps display names', () => {
      const result = transformToMinerTypeBarData(minerLog)
      expect(result.labels).toEqual(['Antminer S19XP', 'WhatsMiner M56S'])
      expect(result.series[0]?.values).toEqual([5.5, 3.2])
    })

    it('honours the selected miner types filter', () => {
      const result = transformToMinerTypeBarData(minerLog, ['miner-wm-m56s'])
      expect(result.labels).toEqual(['WhatsMiner M56S'])
      expect(result.series[0]?.values).toEqual([3.2])
    })
  })

  describe('transformToMiningUnitBarData', () => {
    it('returns empty data when log is missing or empty', () => {
      expect(transformToMiningUnitBarData(undefined)).toEqual({ labels: [], series: [] })
      expect(transformToMiningUnitBarData([])).toEqual({ labels: [], series: [] })
    })

    it('drops BE-leaked rollup keys (group-N, maintenance)', () => {
      const result = transformToMiningUnitBarData(containerLog)
      expect(result.labels).toEqual(['Bitdeer 1A', 'Bitdeer 4A'])
      expect(result.series[0]?.values).toEqual([4.2, 2.1])
    })
  })

  describe('option helpers', () => {
    it('getMinerTypeOptionsFromLog returns non-zero miner types with display labels', () => {
      const options = getMinerTypeOptionsFromLog(minerLog)
      expect(options).toContainEqual({ value: 'miner-am-s19xp', label: 'Antminer S19XP' })
      expect(options).toContainEqual({ value: 'miner-wm-m56s', label: 'WhatsMiner M56S' })
      expect(options.map((o) => o.value)).not.toContain('miner-av-a1346')
    })

    it('getMiningUnitOptionsFromLog excludes leaked rollup keys', () => {
      const options = getMiningUnitOptionsFromLog(containerLog)
      const values = options.map((o) => o.value)
      expect(values).toEqual(['bitdeer-1a', 'bitdeer-4a'])
      expect(values).not.toContain('maintenance')
      expect(values).not.toContain('group-1')
      expect(values).not.toContain('group-7')
    })
  })
})
