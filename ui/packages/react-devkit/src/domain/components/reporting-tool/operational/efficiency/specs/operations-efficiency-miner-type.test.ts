import { describe, expect, it } from 'vitest'

import { MINER_TYPE_NAME_MAP } from '../../../../../constants/device-constants'
import { MINER_TYPE_VIEW_SERIES_LABEL, TAIL_LOG_MINER_TYPE_KEY } from '../efficiency.constants'
import { toOperationsEfficiencyMinerType } from '../operations-efficiency-miner-type'

const makeTailLog = (typeGroup: Record<string, number>) => ({
  [TAIL_LOG_MINER_TYPE_KEY]: typeGroup,
})

describe('toOperationsEfficiencyMinerType', () => {
  describe('null / undefined input', () => {
    it('returns empty chartInput and isEmpty=true when tailLog is null', () => {
      const result = toOperationsEfficiencyMinerType({ tailLog: null })
      expect(result.isEmpty).toBe(true)
      expect(result.chartInput.series[0]?.values).toEqual([])
      expect(result.chartInput.labels).toEqual([])
    })

    it('returns empty when tailLog is undefined', () => {
      const result = toOperationsEfficiencyMinerType({ tailLog: undefined })
      expect(result.isEmpty).toBe(true)
    })

    it('returns empty when group key is absent from tailLog', () => {
      const result = toOperationsEfficiencyMinerType({ tailLog: {} })
      expect(result.isEmpty).toBe(true)
    })
  })

  describe('data extraction', () => {
    it('extracts values keyed under the miner-type group key', () => {
      const antminerType = Object.keys(MINER_TYPE_NAME_MAP)[0] as string
      const result = toOperationsEfficiencyMinerType({
        tailLog: makeTailLog({ [antminerType]: 22.5 }),
      })
      expect(result.isEmpty).toBe(false)
      expect(result.chartInput.series[0]?.values).toEqual([22.5])
    })

    it('uses MINER_TYPE_VIEW_SERIES_LABEL as the dataset label', () => {
      const anyType = Object.keys(MINER_TYPE_NAME_MAP)[0] as string
      const result = toOperationsEfficiencyMinerType({
        tailLog: makeTailLog({ [anyType]: 20 }),
      })
      expect(result.chartInput.series[0]?.label).toBe(MINER_TYPE_VIEW_SERIES_LABEL)
    })

    it('maps known miner type keys to display names via MINER_TYPE_NAME_MAP', () => {
      const [rawKey, displayName] = Object.entries(MINER_TYPE_NAME_MAP)[0] as [string, string]
      const result = toOperationsEfficiencyMinerType({
        tailLog: makeTailLog({ [rawKey]: 21 }),
      })
      expect(result.chartInput.labels).toEqual([displayName])
    })

    it('falls back to raw key for unknown miner types', () => {
      const result = toOperationsEfficiencyMinerType({
        tailLog: makeTailLog({ unknown_miner_xyz: 18 }),
      })
      expect(result.chartInput.labels).toEqual(['unknown_miner_xyz'])
    })
  })

  describe('sorting', () => {
    it('sorts categories alphabetically', () => {
      const result = toOperationsEfficiencyMinerType({
        tailLog: makeTailLog({ b_type: 15, a_type: 20, c_type: 18 }),
      })
      expect(result.chartInput.labels).toEqual(['a_type', 'b_type', 'c_type'])
      expect(result.chartInput.series[0]?.values).toEqual([20, 15, 18])
    })
  })

  describe('isEmpty flag', () => {
    it('is false when categories exist, even with zero values', () => {
      const anyType = Object.keys(MINER_TYPE_NAME_MAP)[0] as string
      const result = toOperationsEfficiencyMinerType({
        tailLog: makeTailLog({ [anyType]: 0 }),
      })
      expect(result.isEmpty).toBe(false)
    })

    it('is true when the group is an empty object', () => {
      const result = toOperationsEfficiencyMinerType({
        tailLog: makeTailLog({}),
      })
      expect(result.isEmpty).toBe(true)
    })
  })
})
