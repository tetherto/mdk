import { describe, expect, it } from 'vitest'

import { useNominalConfig } from '../use-nominal-config'

type GlobalConfig = {
  nominalSiteHashrate_MHS?: number
  nominalAvailablePowerMWh?: number
  nominalPowerConsumption_MW?: number
  nominalWeightedAvgEfficiency_WThs?: number
  nominalMinerCapacity?: number
  [key: string]: unknown
}

const createGlobalConfig = (overrides?: Partial<GlobalConfig>): GlobalConfig => ({
  nominalSiteHashrate_MHS: 0,
  nominalAvailablePowerMWh: 0,
  nominalPowerConsumption_MW: 0,
  nominalWeightedAvgEfficiency_WThs: 0,
  nominalMinerCapacity: 0,
  ...overrides,
})

const ZEROS = {
  hashrate_MHS: 0,
  powerAvailability_MW: 0,
  powerConsumption_MW: 0,
  weightedAvgEfficiency: 0,
  minerCapacity: 0,
}

describe('useNominalConfig', () => {
  describe('null / undefined input', () => {
    it('returns zeros when globalConfig is null', () => {
      expect(useNominalConfig({ globalConfig: null })).toEqual(ZEROS)
    })

    it('returns zeros when globalConfig is undefined', () => {
      expect(useNominalConfig({ globalConfig: undefined })).toEqual(ZEROS)
    })
  })

  describe('single config object', () => {
    it('derives hashrate_MHS from nominalSiteHashrate_MHS', () => {
      const result = useNominalConfig({
        globalConfig: createGlobalConfig({ nominalSiteHashrate_MHS: 50_000 }),
      })
      expect(result.hashrate_MHS).toBe(50_000)
    })

    it('derives powerAvailability_MW from nominalAvailablePowerMWh', () => {
      const result = useNominalConfig({
        globalConfig: createGlobalConfig({ nominalAvailablePowerMWh: 12.5 }),
      })
      expect(result.powerAvailability_MW).toBe(12.5)
    })

    it('derives powerConsumption_MW from nominalPowerConsumption_MW', () => {
      const result = useNominalConfig({
        globalConfig: createGlobalConfig({ nominalPowerConsumption_MW: 10.2 }),
      })
      expect(result.powerConsumption_MW).toBe(10.2)
    })

    it('derives weightedAvgEfficiency from nominalWeightedAvgEfficiency_WThs', () => {
      const result = useNominalConfig({
        globalConfig: createGlobalConfig({ nominalWeightedAvgEfficiency_WThs: 22.5 }),
      })
      expect(result.weightedAvgEfficiency).toBe(22.5)
    })

    it('derives minerCapacity from nominalMinerCapacity', () => {
      const result = useNominalConfig({
        globalConfig: createGlobalConfig({ nominalMinerCapacity: 1024 }),
      })
      expect(result.minerCapacity).toBe(1024)
    })

    it('returns zeros for missing optional fields', () => {
      expect(useNominalConfig({ globalConfig: {} })).toEqual(ZEROS)
    })

    it('returns all derived values from a fully populated config', () => {
      const result = useNominalConfig({
        globalConfig: createGlobalConfig({
          nominalSiteHashrate_MHS: 100_000,
          nominalAvailablePowerMWh: 15,
          nominalPowerConsumption_MW: 12,
          nominalWeightedAvgEfficiency_WThs: 21,
          nominalMinerCapacity: 500,
        }),
      })

      expect(result).toEqual({
        hashrate_MHS: 100_000,
        powerAvailability_MW: 15,
        powerConsumption_MW: 12,
        weightedAvgEfficiency: 21,
        minerCapacity: 500,
      })
    })
  })

  describe('array input', () => {
    it('picks the first element when given an array', () => {
      const result = useNominalConfig({
        globalConfig: [
          createGlobalConfig({ nominalSiteHashrate_MHS: 75_000 }),
          createGlobalConfig({ nominalSiteHashrate_MHS: 1 }),
        ],
      })
      expect(result.hashrate_MHS).toBe(75_000)
    })

    it('returns zeros when given an empty array', () => {
      expect(useNominalConfig({ globalConfig: [] })).toEqual(ZEROS)
    })
  })
})
