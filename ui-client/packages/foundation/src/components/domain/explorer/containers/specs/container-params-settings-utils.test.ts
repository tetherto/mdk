import { UNITS } from '@tetherto/mdk-core-ui'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Device } from '@/types'
import { isBitdeer, isMicroBT } from '@/utils/container-utils'
import { getBitdeerParameterSettingsData } from '../bitdeer'
import type { ParameterSettings } from '../container-params-settings-utils'
import {
  getBitdeerParametersSettings,
  getContainerParametersSettings,
  getMicroBTParametersSettings,
} from '../container-params-settings-utils'
import { getMicroBTThresholdSettingsData } from '../micro-bt/settings/micro-bt-utils'

vi.mock('@/utils/container-utils', () => ({
  isBitdeer: vi.fn((type) => type === 'bitdeer' || type === 'bitdeer-immersion'),
  isMicroBT: vi.fn((type) => type === 'microbt' || type === 'microbt-kehua'),
}))

vi.mock('../bitdeer', () => ({
  getBitdeerParameterSettingsData: vi.fn(() => ({
    alarms: {
      oil_temp: { low_c: 10, high_c: 50 },
      water_temp: { low_c: 15, high_c: 45 },
      pressure_bar: 2.5,
    },
    set_temps: {
      cold_oil_temp_c: 25,
      exhaust_fan_temp_c: 40,
    },
  })),
}))

vi.mock('../micro-bt/settings/micro-bt-utils', () => ({
  getMicroBTThresholdSettingsData: vi.fn(() => ({
    coolingFanRunningSpeedThreshold: 1500,
    coolingFanStartTemperatureThreshold: 30,
    coolingFanStopTemperatureThreshold: 25,
  })),
}))

describe('./container-params-settings-utils', () => {
  const mockBitdeerDevice: Device = {
    id: 'bitdeer-1',
    type: 'bitdeer',
    status: 'active',
    last: {
      snap: {
        stats: {},
        config: {},
      },
    },
  }

  const mockBitdeerImmersionDevice: Device = {
    id: 'bitdeer-immersion-1',
    type: 'bitdeer-immersion',
    status: 'active',
    last: {
      snap: {
        stats: {},
        config: {},
      },
    },
  }

  const mockMicroBTDevice: Device = {
    id: 'microbt-1',
    type: 'microbt',
    status: 'active',
    last: {
      snap: {
        stats: {},
        config: {},
      },
    },
  }

  const mockMicroBTKehuaDevice: Device = {
    id: 'microbt-kehua-1',
    type: 'microbt-kehua',
    status: 'active',
    last: {
      snap: {
        stats: {},
        config: {},
      },
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getBitdeerParametersSettings', () => {
    it('returns all Bitdeer parameters', () => {
      const result = getBitdeerParametersSettings(mockBitdeerDevice)

      expect(result).toHaveProperty('coolOilAlarmTemp')
      expect(result).toHaveProperty('coolWaterAlarmTemp')
      expect(result).toHaveProperty('coolOilSetTemp')
      expect(result).toHaveProperty('hotOilAlarmTemp')
      expect(result).toHaveProperty('hotWaterAlarmTemp')
      expect(result).toHaveProperty('exhaustFansRunTemp')
      expect(result).toHaveProperty('alarmPressure')
    })

    it('sets correct values for oil temperatures', () => {
      const result = getBitdeerParametersSettings(mockBitdeerDevice)

      expect(result.coolOilAlarmTemp).toEqual({
        name: 'Cool Oil Alarm Temp',
        value: 10,
        suffix: UNITS.TEMPERATURE_C,
        type: 'number',
      })

      expect(result.hotOilAlarmTemp).toEqual({
        name: 'Hot Oil Alarm Temp',
        value: 50,
        suffix: UNITS.TEMPERATURE_C,
        type: 'number',
      })
    })

    it('sets correct values for water temperatures', () => {
      const result = getBitdeerParametersSettings(mockBitdeerDevice)

      expect(result.coolWaterAlarmTemp).toEqual({
        name: 'Cool Water Alarm Temp',
        value: 15,
        suffix: UNITS.TEMPERATURE_C,
        type: 'number',
      })

      expect(result.hotWaterAlarmTemp).toEqual({
        name: 'Hot Water Alarm Temp',
        value: 45,
        suffix: UNITS.TEMPERATURE_C,
        type: 'number',
      })
    })

    it('sets correct value for oil set temperature', () => {
      const result = getBitdeerParametersSettings(mockBitdeerDevice)

      expect(result.coolOilSetTemp).toEqual({
        name: 'Cool Oil Setting Temp',
        value: 25,
        suffix: UNITS.TEMPERATURE_C,
        type: 'number',
      })
    })

    it('sets correct value for exhaust fan temperature', () => {
      const result = getBitdeerParametersSettings(mockBitdeerDevice)

      expect(result.exhaustFansRunTemp).toEqual({
        name: 'Exhaust Fans Run Temp',
        value: 40,
        suffix: UNITS.TEMPERATURE_C,
        type: 'number',
      })
    })

    it('sets correct value for alarm pressure', () => {
      const result = getBitdeerParametersSettings(mockBitdeerDevice)

      expect(result.alarmPressure).toEqual({
        name: 'Alarm Pressure',
        value: 2.5,
        suffix: UNITS.PRESSURE_BAR,
        type: 'number',
      })
    })

    it('calls getBitdeerParameterSettingsData with device', () => {
      getBitdeerParametersSettings(mockBitdeerDevice)
      expect(getBitdeerParameterSettingsData).toHaveBeenCalledWith(mockBitdeerDevice)
    })

    it('handles missing alarm data gracefully', () => {
      vi.mocked(getBitdeerParameterSettingsData).mockReturnValueOnce({
        alarms: {},
        set_temps: {},
      })

      const result = getBitdeerParametersSettings(mockBitdeerDevice)

      expect(result.coolOilAlarmTemp.value).toBeUndefined()
      expect(result.alarmPressure.value).toBeUndefined()
    })
  })

  describe('getMicroBTParametersSettings', () => {
    it('returns all MicroBT parameters', () => {
      const result = getMicroBTParametersSettings(mockMicroBTDevice)

      expect(result).toHaveProperty('runningSpeed')
      expect(result).toHaveProperty('startTemp')
      expect(result).toHaveProperty('stopTemp')
    })

    it('sets correct value for running speed', () => {
      const result = getMicroBTParametersSettings(mockMicroBTDevice)

      expect(result.runningSpeed).toEqual({
        name: 'Running Speed',
        value: 1500,
        suffix: 'RPM',
        type: 'number',
      })
    })

    it('sets correct value for start temperature', () => {
      const result = getMicroBTParametersSettings(mockMicroBTDevice)

      expect(result.startTemp).toEqual({
        name: 'Start Temp',
        value: 30,
        suffix: UNITS.TEMPERATURE_C,
        type: 'number',
      })
    })

    it('sets correct value for stop temperature', () => {
      const result = getMicroBTParametersSettings(mockMicroBTDevice)

      expect(result.stopTemp).toEqual({
        name: 'Stop Temp',
        value: 25,
        suffix: UNITS.TEMPERATURE_C,
        type: 'number',
      })
    })

    it('calls getMicroBTThresholdSettingsData with device', () => {
      getMicroBTParametersSettings(mockMicroBTDevice)
      expect(getMicroBTThresholdSettingsData).toHaveBeenCalledWith(mockMicroBTDevice)
    })

    it('handles missing threshold data gracefully', () => {
      vi.mocked(getMicroBTThresholdSettingsData).mockReturnValueOnce({
        coolingFanRunningSpeedThreshold: undefined,
        coolingFanStartTemperatureThreshold: undefined,
        coolingFanStopTemperatureThreshold: undefined,
      })

      const result = getMicroBTParametersSettings(mockMicroBTDevice)

      expect(result.runningSpeed.value).toBeUndefined()
      expect(result.startTemp.value).toBeUndefined()
      expect(result.stopTemp.value).toBeUndefined()
    })
  })

  describe('getContainerParametersSettings', () => {
    it('returns Bitdeer settings for bitdeer type', () => {
      const result = getContainerParametersSettings(mockBitdeerDevice)

      expect(result).toBeDefined()
      expect(result).toHaveProperty('coolOilAlarmTemp')
      expect(result).toHaveProperty('alarmPressure')
      expect(isBitdeer).toHaveBeenCalledWith('bitdeer')
    })

    it('returns Bitdeer settings for bitdeer-immersion type', () => {
      const result = getContainerParametersSettings(mockBitdeerImmersionDevice)

      expect(result).toBeDefined()
      expect(result).toHaveProperty('coolOilAlarmTemp')
      expect(isBitdeer).toHaveBeenCalledWith('bitdeer-immersion')
    })

    it('returns MicroBT settings for microbt type', () => {
      const result = getContainerParametersSettings(mockMicroBTDevice)

      expect(result).toBeDefined()
      expect(result).toHaveProperty('runningSpeed')
      expect(result).toHaveProperty('startTemp')
      expect(isMicroBT).toHaveBeenCalledWith('microbt')
    })

    it('returns MicroBT settings for microbt-kehua type', () => {
      const result = getContainerParametersSettings(mockMicroBTKehuaDevice)

      expect(result).toBeDefined()
      expect(result).toHaveProperty('runningSpeed')
      expect(isMicroBT).toHaveBeenCalledWith('microbt-kehua')
    })

    it('returns undefined for unknown container type', () => {
      const unknownDevice: Device = {
        id: 'unknown-1',
        type: 'unknown-type',
        status: 'active',
        last: {
          snap: {
            stats: {},
            config: {},
          },
        },
      }

      const result = getContainerParametersSettings(unknownDevice)
      expect(result).toBeUndefined()
    })

    it('returns undefined when no data provided', () => {
      const result = getContainerParametersSettings()
      expect(result).toBeUndefined()
    })

    it('returns undefined when device is null', () => {
      const result = getContainerParametersSettings(undefined)
      expect(result).toBeUndefined()
    })

    it('returns undefined when device has no type', () => {
      const noTypeDevice = {
        id: 'no-type',
        status: 'active',
        last: {
          snap: {
            stats: {},
            config: {},
          },
        },
      } as unknown as Device

      const result = getContainerParametersSettings(noTypeDevice)
      expect(result).toBeUndefined()
    })

    it('returns undefined when device type is empty string', () => {
      const emptyTypeDevice: Device = {
        id: 'empty-type',
        type: '',
        status: 'active',
        last: {
          snap: {
            stats: {},
            config: {},
          },
        },
      }

      const result = getContainerParametersSettings(emptyTypeDevice)
      expect(result).toBeUndefined()
    })

    it('calls correct getter function for matched type', () => {
      getContainerParametersSettings(mockBitdeerDevice)

      expect(getBitdeerParameterSettingsData).toHaveBeenCalledWith(mockBitdeerDevice)
    })

    it('does not call getters when type does not match', () => {
      const unknownDevice: Device = {
        id: 'unknown',
        type: 'unknown',
        status: 'active',
        last: { snap: { stats: {}, config: {} } },
      }

      vi.clearAllMocks()
      getContainerParametersSettings(unknownDevice)

      expect(getBitdeerParameterSettingsData).not.toHaveBeenCalled()
      expect(getMicroBTThresholdSettingsData).not.toHaveBeenCalled()
    })

    it('returns correct structure with all fields', () => {
      const result = getContainerParametersSettings(mockBitdeerDevice) as ParameterSettings

      Object.values(result).forEach((setting) => {
        expect(setting).toHaveProperty('name')
        expect(setting).toHaveProperty('suffix')
        expect(setting).toHaveProperty('type')
        expect(typeof setting.name).toBe('string')
        expect(typeof setting.suffix).toBe('string')
        expect(['number', 'string']).toContain(setting.type)
      })
    })

    it('uses correct units from UNITS constant', () => {
      const bitdeerResult = getBitdeerParametersSettings(mockBitdeerDevice)
      expect(bitdeerResult.coolOilAlarmTemp.suffix).toBe(UNITS.TEMPERATURE_C)
      expect(bitdeerResult.alarmPressure.suffix).toBe(UNITS.PRESSURE_BAR)

      const microBTResult = getMicroBTParametersSettings(mockMicroBTDevice)
      expect(microBTResult.startTemp.suffix).toBe(UNITS.TEMPERATURE_C)
      expect(microBTResult.stopTemp.suffix).toBe(UNITS.TEMPERATURE_C)
    })
  })
})
