import { describe, expect, it } from 'vitest'

import { MAINTENANCE_CONTAINER } from '../../../../../constants/container-constants'
import type { Container } from '../../../../../types'
import { MINER_UNIT_VIEW_SERIES_LABEL, TAIL_LOG_CONTAINER_KEY } from '../efficiency.constants'
import { toOperationsEfficiencyMinerUnit } from '../operations-efficiency-miner-unit'

const makeContainer = (id: string, type: string): Container =>
  ({ info: { container: id }, type }) as unknown as Container

const makeTailLog = (containerGroup: Record<string, unknown>) => ({
  [TAIL_LOG_CONTAINER_KEY]: containerGroup,
})

describe('toOperationsEfficiencyMinerUnit', () => {
  describe('null / undefined input', () => {
    it('returns empty chartInput and isEmpty=true when tailLog is null', () => {
      const result = toOperationsEfficiencyMinerUnit({ tailLog: null })
      expect(result.isEmpty).toBe(true)
      expect(result.chartInput.labels).toEqual([])
    })

    it('returns empty when tailLog is undefined', () => {
      const result = toOperationsEfficiencyMinerUnit({ tailLog: undefined })
      expect(result.isEmpty).toBe(true)
    })

    it('returns empty when group key is absent', () => {
      const result = toOperationsEfficiencyMinerUnit({ tailLog: {} })
      expect(result.isEmpty).toBe(true)
    })
  })

  describe('filtering', () => {
    it('excludes keys that contain the maintenance container string', () => {
      const result = toOperationsEfficiencyMinerUnit({
        tailLog: makeTailLog({
          [`${MAINTENANCE_CONTAINER}_slot`]: 20,
          good_container: 18,
        }),
      })
      expect(result.chartInput.labels).toEqual(['good_container'])
    })

    it('includes entries with zero value', () => {
      const result = toOperationsEfficiencyMinerUnit({
        tailLog: makeTailLog({ zero_unit: 0, active_unit: 22 }),
      })
      expect(result.chartInput.labels).toEqual(['active_unit', 'zero_unit'])
    })

    it('excludes non-numeric values', () => {
      const result = toOperationsEfficiencyMinerUnit({
        tailLog: makeTailLog({ string_unit: 'bad', numeric_unit: 19 }),
      })
      expect(result.chartInput.labels).toEqual(['numeric_unit'])
    })

    it('excludes negative values', () => {
      const result = toOperationsEfficiencyMinerUnit({
        tailLog: makeTailLog({ negative_unit: -5, ok_unit: 15 }),
      })
      expect(result.chartInput.labels).toEqual(['ok_unit'])
    })
  })

  describe('label resolution', () => {
    it('uses container display name when a matching container is provided', () => {
      const containers = [makeContainer('container_01', 'whatsminer')]
      const result = toOperationsEfficiencyMinerUnit({
        tailLog: makeTailLog({ container_01: 20 }),
        containers,
      })
      expect(result.chartInput.labels[0]).toBeTruthy()
      expect(typeof result.chartInput.labels[0]).toBe('string')
    })

    it('falls back to raw container id when no match is found', () => {
      const result = toOperationsEfficiencyMinerUnit({
        tailLog: makeTailLog({ unknown_container: 18 }),
        containers: [],
      })
      expect(result.chartInput.labels).toEqual(['unknown_container'])
    })

    it('uses raw id when container type is undefined', () => {
      const containers = [{ info: { container: 'no_type_unit' } } as unknown as Container]
      const result = toOperationsEfficiencyMinerUnit({
        tailLog: makeTailLog({ no_type_unit: 17 }),
        containers,
      })
      expect(result.chartInput.labels).toEqual(['no_type_unit'])
    })
  })

  describe('sorting', () => {
    it('sorts categories alphabetically after filtering', () => {
      const result = toOperationsEfficiencyMinerUnit({
        tailLog: makeTailLog({ c_unit: 10, a_unit: 20, b_unit: 15 }),
      })
      expect(result.chartInput.labels).toEqual(['a_unit', 'b_unit', 'c_unit'])
      expect(result.chartInput.series[0]?.values).toEqual([20, 15, 10])
    })
  })

  describe('isEmpty flag', () => {
    it('is false when at least one valid container remains', () => {
      const result = toOperationsEfficiencyMinerUnit({
        tailLog: makeTailLog({ valid: 21 }),
      })
      expect(result.isEmpty).toBe(false)
    })

    it('is true after all entries are filtered out', () => {
      const result = toOperationsEfficiencyMinerUnit({
        tailLog: makeTailLog({ [`${MAINTENANCE_CONTAINER}_a`]: 10, negative_b: -1 }),
      })
      expect(result.isEmpty).toBe(true)
    })
  })

  describe('dataset label', () => {
    it('uses MINER_UNIT_VIEW_SERIES_LABEL as the series label', () => {
      const result = toOperationsEfficiencyMinerUnit({
        tailLog: makeTailLog({ unit_a: 20 }),
      })
      expect(result.chartInput.series[0]?.label).toBe(MINER_UNIT_VIEW_SERIES_LABEL)
    })
  })
})
