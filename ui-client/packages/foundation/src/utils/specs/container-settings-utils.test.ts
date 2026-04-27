import type { UnknownRecord } from '@mdk/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getBitdeerParameterSettingsData } from '../../components/domain'
import type { ParameterSetting } from '../container-settings-utils'
import {
  getBitdeerParametersSettings,
  getContainerParametersSettings,
  getDefaultThresholdStructure,
  prepareContainerSettingsPayload,
  transformContainerParameters,
  transformContainerThresholds,
} from '../container-settings-utils'

vi.mock('./container-utils', () => ({
  isBitdeer: vi.fn((type) => type?.includes('bd')),
  isMicroBT: vi.fn((type) => type?.includes('mbt')),
  isAntspaceHydro: vi.fn((type) => type?.includes('hydro')),
  isAntspaceImmersion: vi.fn((type) => type?.includes('immersion')),
}))

vi.mock('../../components/domain', () => ({
  getBitdeerParameterSettingsData: vi.fn((data: UnknownRecord) => ({
    alarms: data.alarms || {
      oil_temp: { low_c: 33, high_c: 48 },
      water_temp: { low_c: 30, high_c: 45 },
      pressure_bar: 2.5,
    },
    set_temps: data.set_temps || {
      cold_oil_temp_c: 35,
      exhaust_fan_temp_c: 40,
    },
  })),
}))

describe('transformContainerParameters', () => {
  it('returns empty for missing data', () => {
    expect(transformContainerParameters({}, {})).toEqual({})
    expect(transformContainerParameters({ type: 'bd' }, null as any)).toEqual({})
  })

  it('transforms bitdeer parameters', () => {
    const result = transformContainerParameters(
      { type: 'container-bd-d40' },
      {
        coolOilAlarmTemp: { value: 45 },
        coolOilSetTemp: { value: 40 },
      },
    )

    expect(result).toEqual({
      coolOilAlarmTemp: 45,
      coolWaterAlarmTemp: undefined,
      coolOilSetTemp: 40,
      hotOilAlarmTemp: undefined,
      hotWaterAlarmTemp: undefined,
      exhaustFansRunTemp: undefined,
      alarmPressure: undefined,
    })
  })

  it('transforms microbt parameters', () => {
    const result = transformContainerParameters(
      { type: 'container-mbt-100' },
      {
        runningSpeed: { value: 80 },
        startTemp: { value: 30 },
        stopTemp: { value: 25 },
      },
    )

    expect(result).toEqual({
      runningSpeed: 80,
      startTemp: 30,
      stopTemp: 25,
    })
  })
})

describe('transformContainerThresholds', () => {
  it('returns empty for missing data', () => {
    expect(transformContainerThresholds({}, {})).toEqual({})
    expect(transformContainerThresholds({ type: 'bd' }, null as any)).toEqual({})
  })

  it('transforms bitdeer thresholds', () => {
    const result = transformContainerThresholds(
      { type: 'container-bd-d40' },
      {
        oilTemperature: { criticalLow: 33, normal: 42 },
        tankPressure: { criticalLow: 2, normal: 2.3 },
      },
    )

    expect(result).toEqual({
      oilTemperature: {
        criticalLow: 33,
        alert: undefined,
        normal: 42,
        alarm: undefined,
        criticalHigh: undefined,
      },
      tankPressure: {
        criticalLow: 2,
        alarmLow: undefined,
        normal: 2.3,
        alarmHigh: undefined,
        criticalHigh: undefined,
      },
    })
  })

  it('transforms microbt thresholds', () => {
    const result = transformContainerThresholds(
      { type: 'container-mbt-100' },
      {
        waterTemperature: { criticalLow: 25, normal: 33 },
      },
    )

    expect(result).toEqual({
      waterTemperature: {
        criticalLow: 25,
        alarmLow: undefined,
        normal: 33,
        alarmHigh: undefined,
        criticalHigh: undefined,
      },
    })
  })

  it('transforms hydro thresholds', () => {
    const result = transformContainerThresholds(
      { type: 'container-as-hk3' },
      {
        waterTemperature: { criticalLow: 21, normal: 30 },
        supplyLiquidPressure: { criticalLow: 2, normal: 2.3 },
      },
    )

    expect(result.waterTemperature).toBeDefined()
    expect(result.supplyLiquidPressure).toBeDefined()
  })

  it('transforms immersion thresholds', () => {
    const result = transformContainerThresholds(
      { type: 'container-as-immersion' },
      {
        oilTemperature: { criticalLow: 33, normal: 42 },
      },
    )

    expect(result.oilTemperature).toEqual({
      criticalLow: 33,
      alert: undefined,
      normal: 42,
      alarm: undefined,
      criticalHigh: undefined,
    })
  })
})

describe('prepareContainerSettingsPayload', () => {
  it('creates complete payload', () => {
    const result = prepareContainerSettingsPayload(
      { type: 'container-bd-d40' },
      { coolOilSetTemp: { value: 40 } },
      { oilTemperature: { normal: 42 } },
    )

    expect(result).toEqual({
      data: {
        model: 'container-bd-d40',
        parameters: {
          coolOilAlarmTemp: undefined,
          coolWaterAlarmTemp: undefined,
          coolOilSetTemp: 40,
          hotOilAlarmTemp: undefined,
          hotWaterAlarmTemp: undefined,
          exhaustFansRunTemp: undefined,
          alarmPressure: undefined,
        },
        thresholds: {
          oilTemperature: {
            criticalLow: undefined,
            alert: undefined,
            normal: 42,
            alarm: undefined,
            criticalHigh: undefined,
          },
          tankPressure: {
            criticalLow: undefined,
            alarmLow: undefined,
            normal: undefined,
            alarmHigh: undefined,
            criticalHigh: undefined,
          },
        },
      },
    })
  })
})

describe('getDefaultThresholdStructure', () => {
  it('returns bitdeer defaults', () => {
    const result = getDefaultThresholdStructure('container-bd-d40')

    expect(result.oilTemperature).toEqual({
      criticalLow: 33,
      alert: 39,
      normal: 42,
      alarm: 46,
      criticalHigh: 48,
    })
    expect(result.tankPressure).toBeDefined()
  })

  it('returns microbt defaults', () => {
    const result = getDefaultThresholdStructure('container-mbt-100')

    expect(result.waterTemperature).toEqual({
      criticalLow: 25,
      alarmLow: 33,
      normal: 33,
      alarmHigh: 37,
      criticalHigh: 39,
    })
  })

  it('returns hydro defaults', () => {
    const result = getDefaultThresholdStructure('container-as-hk3')

    expect(result.waterTemperature).toBeDefined()
    expect(result.supplyLiquidPressure).toBeDefined()
  })

  it('returns immersion defaults', () => {
    const result = getDefaultThresholdStructure('container-as-immersion')

    expect(result.oilTemperature).toBeDefined()
  })

  it('returns empty for unknown type', () => {
    const result = getDefaultThresholdStructure('unknown')
    expect(result).toEqual({})
  })

  describe('getBitdeerParametersSettings', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('returns all 7 Bitdeer parameters', () => {
      const data = { type: 'container-bd-d40' }
      const result = getBitdeerParametersSettings(data)

      expect(Object.keys(result)).toHaveLength(7)
      expect(result).toHaveProperty('coolOilAlarmTemp')
      expect(result).toHaveProperty('coolWaterAlarmTemp')
      expect(result).toHaveProperty('coolOilSetTemp')
      expect(result).toHaveProperty('hotOilAlarmTemp')
      expect(result).toHaveProperty('hotWaterAlarmTemp')
      expect(result).toHaveProperty('exhaustFansRunTemp')
      expect(result).toHaveProperty('alarmPressure')
    })

    it('returns correctly formatted cool oil alarm temperature', () => {
      const data = { type: 'container-bd-d40' }
      const result = getBitdeerParametersSettings(data)

      expect(result.coolOilAlarmTemp).toEqual({
        name: 'Cool Oil Alarm Temp',
        value: 33,
        suffix: '°C',
        type: 'number',
      })
    })

    it('returns correctly formatted cool water alarm temperature', () => {
      const data = { type: 'container-bd-d40' }
      const result = getBitdeerParametersSettings(data)

      expect(result.coolWaterAlarmTemp).toEqual({
        name: 'Cool Water Alarm Temp',
        value: 30,
        suffix: '°C',
        type: 'number',
      })
    })

    it('returns correctly formatted cool oil set temperature', () => {
      const data = { type: 'container-bd-d40' }
      const result = getBitdeerParametersSettings(data)

      expect(result.coolOilSetTemp).toEqual({
        name: 'Cool Oil Setting Temp',
        value: 35,
        suffix: '°C',
        type: 'number',
      })
    })

    it('returns correctly formatted hot oil alarm temperature', () => {
      const data = { type: 'container-bd-d40' }
      const result = getBitdeerParametersSettings(data)

      expect(result.hotOilAlarmTemp).toEqual({
        name: 'Hot Oil Alarm Temp',
        value: 48,
        suffix: '°C',
        type: 'number',
      })
    })

    it('returns correctly formatted hot water alarm temperature', () => {
      const data = { type: 'container-bd-d40' }
      const result = getBitdeerParametersSettings(data)

      expect(result.hotWaterAlarmTemp).toEqual({
        name: 'Hot Water Alarm Temp',
        value: 45,
        suffix: '°C',
        type: 'number',
      })
    })

    it('returns correctly formatted exhaust fans run temperature', () => {
      const data = { type: 'container-bd-d40' }
      const result = getBitdeerParametersSettings(data)

      expect(result.exhaustFansRunTemp).toEqual({
        name: 'Exhaust Fans Run Temp',
        value: 40,
        suffix: '°C',
        type: 'number',
      })
    })

    it('returns correctly formatted alarm pressure', () => {
      const data = { type: 'container-bd-d40' }
      const result = getBitdeerParametersSettings(data)

      expect(result.alarmPressure).toEqual({
        name: 'Alarm Pressure',
        value: 2.5,
        suffix: 'bar',
        type: 'number',
      })
    })

    it('handles custom alarm values', () => {
      const data = {
        type: 'container-bd-d40',
        alarms: {
          oil_temp: { low_c: 25, high_c: 55 },
          water_temp: { low_c: 20, high_c: 50 },
          pressure_bar: 3.0,
        },
        set_temps: {
          cold_oil_temp_c: 28,
          exhaust_fan_temp_c: 45,
        },
      }
      const result = getBitdeerParametersSettings(data)

      expect(result.coolOilAlarmTemp.value).toBe(25)
      expect(result.hotOilAlarmTemp.value).toBe(55)
      expect(result.alarmPressure.value).toBe(3.0)
    })

    it('handles missing oil_temp data gracefully', () => {
      vi.mocked(getBitdeerParameterSettingsData).mockReturnValueOnce({
        alarms: {
          water_temp: { low_c: 30, high_c: 45 },
          pressure_bar: 2.5,
        },
        set_temps: {
          cold_oil_temp_c: 35,
        },
      })

      const data = { type: 'container-bd-d40' }
      const result = getBitdeerParametersSettings(data)

      expect(result.coolOilAlarmTemp.value).toBeUndefined()
      expect(result.hotOilAlarmTemp.value).toBeUndefined()
    })

    it('handles missing water_temp data gracefully', () => {
      vi.mocked(getBitdeerParameterSettingsData).mockReturnValueOnce({
        alarms: {
          oil_temp: { low_c: 33, high_c: 48 },
          pressure_bar: 2.5,
        },
        set_temps: {
          cold_oil_temp_c: 35,
        },
      })

      const data = { type: 'container-bd-d40' }
      const result = getBitdeerParametersSettings(data)

      expect(result.coolWaterAlarmTemp.value).toBeUndefined()
      expect(result.hotWaterAlarmTemp.value).toBeUndefined()
    })

    it('handles missing set_temps data gracefully', () => {
      vi.mocked(getBitdeerParameterSettingsData).mockReturnValueOnce({
        alarms: {
          oil_temp: { low_c: 33, high_c: 48 },
          water_temp: { low_c: 30, high_c: 45 },
          pressure_bar: 2.5,
        },
        set_temps: {},
      })

      const data = { type: 'container-bd-d40' }
      const result = getBitdeerParametersSettings(data)

      expect(result.coolOilSetTemp.value).toBeUndefined()
      expect(result.exhaustFansRunTemp.value).toBeUndefined()
    })

    it('all parameters have correct suffix format', () => {
      const data = { type: 'container-bd-d40' }
      const result = getBitdeerParametersSettings(data)

      expect(result.coolOilAlarmTemp.suffix).toBe('°C')
      expect(result.coolWaterAlarmTemp.suffix).toBe('°C')
      expect(result.coolOilSetTemp.suffix).toBe('°C')
      expect(result.hotOilAlarmTemp.suffix).toBe('°C')
      expect(result.hotWaterAlarmTemp.suffix).toBe('°C')
      expect(result.exhaustFansRunTemp.suffix).toBe('°C')
      expect(result.alarmPressure.suffix).toBe('bar')
    })

    it('all parameters have type number', () => {
      const data = { type: 'container-bd-d40' }
      const result = getBitdeerParametersSettings(data)

      Object.values(result).forEach((param: ParameterSetting) => {
        expect(param.type).toBe('number')
      })
    })

    it('all parameters have unique names', () => {
      const data = { type: 'container-bd-d40' }
      const result = getBitdeerParametersSettings(data)

      const names = Object.values(result).map((param) => param.name)
      const uniqueNames = new Set(names)
      expect(uniqueNames.size).toBe(names.length)
    })
  })

  describe('getContainerParametersSettings', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('returns undefined when no type provided', () => {
      const result = getContainerParametersSettings({})
      expect(result).toBeUndefined()
    })

    it('returns undefined when type is null', () => {
      const result = getContainerParametersSettings({ type: null })
      expect(result).toBeUndefined()
    })

    it('returns undefined when type is undefined', () => {
      const result = getContainerParametersSettings({ type: undefined })
      expect(result).toBeUndefined()
    })

    it('returns undefined when type is unknown', () => {
      const result = getContainerParametersSettings({ type: 'unknown-type' })
      expect(result).toBeUndefined()
    })

    it('returns undefined for non-Bitdeer container types', () => {
      const result = getContainerParametersSettings({ type: 'container-microbt-m30' })
      expect(result).toBeUndefined()
    })

    it('returns Bitdeer parameters for Bitdeer container', () => {
      const data = { type: 'container-bd-d40' }
      const result = getContainerParametersSettings(data)

      expect(result).toBeDefined()
      expect(result?.coolOilAlarmTemp).toBeDefined()
      expect(result?.alarmPressure).toBeDefined()
    })

    it('returns Bitdeer parameters for bitdeer type (case insensitive)', () => {
      const data = { type: 'container-bitdeer-custom' }
      const result = getContainerParametersSettings(data)

      expect(result).toBeDefined()
      expect(Object.keys(result || {})).toHaveLength(7)
    })

    it('returns Bitdeer parameters for bd type', () => {
      const data = { type: 'container-bd-custom' }
      const result = getContainerParametersSettings(data)

      expect(result).toBeDefined()
      expect(Object.keys(result || {})).toHaveLength(7)
    })

    it('calls getBitdeerParametersSettings for Bitdeer containers', () => {
      const data = { type: 'container-bd-d40' }
      const result = getContainerParametersSettings(data)

      expect(result).toBeDefined()
      expect(result?.coolOilAlarmTemp.name).toBe('Cool Oil Alarm Temp')
    })

    it('passes data correctly to parameter getter', () => {
      const data = {
        type: 'container-bd-d40',
        alarms: {
          oil_temp: { low_c: 99, high_c: 100 },
        },
      }
      const result = getContainerParametersSettings(data)

      expect(result?.coolOilAlarmTemp.value).toBe(99)
      expect(result?.hotOilAlarmTemp.value).toBe(100)
    })

    it('returns parameter settings with all required fields', () => {
      const data = { type: 'container-bd-d40' }
      const result = getContainerParametersSettings(data)

      expect(result).toBeDefined()
      Object.values(result || {}).forEach((param: ParameterSetting) => {
        expect(param).toHaveProperty('name')
        expect(param).toHaveProperty('suffix')
        expect(param).toHaveProperty('type')
        expect(typeof param.name).toBe('string')
        expect(typeof param.suffix).toBe('string')
        expect(typeof param.type).toBe('string')
      })
    })
  })
})
