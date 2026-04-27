import { describe, expect, it, vi } from 'vitest'
import { CONTAINER_MODEL } from '../../../../../../constants/container-constants'
import type { Device } from '../../../../../../types'
import {
  getColorFromThresholds,
  getShouldFlashFromThresholds,
  transformThresholdsForUtility,
} from '../../../../../../utils/container-threshold-utils'
import { CONTAINER_STATUS } from '../../../../../../utils/status-utils'
import {
  DEFAULT_MICROBT_TEMP_THRESHOLDS,
  getMicroBtInletTempColor,
  getMicroBTTempThresholds,
  getMicroBTThresholdSettingsData,
  MICROBT_WATER_TEMP_MIN_BY_CHARACTER_MAP,
  microBtHasAlarmingValue,
  shouldMicroBtTemperatureFlash,
  shouldMicroBtTemperatureSuperflash,
} from '../settings/micro-bt-utils'

vi.mock('../../../../../../utils/container-threshold-utils', () => ({
  getColorFromThresholds: vi.fn((temp, thresholds, disabled) => {
    if (disabled) return 'gray'
    if (temp < thresholds.criticalLow) return 'blue'
    if (temp < thresholds.normal) return 'yellow'
    if (temp < thresholds.alarmHigh) return 'green'
    if (temp < thresholds.criticalHigh) return 'orange'
    return 'red'
  }),
  getShouldFlashFromThresholds: vi.fn((temp, thresholds, status) => {
    if (status === CONTAINER_STATUS.STOPPED || status === CONTAINER_STATUS.OFFLINE) return false
    return temp < thresholds.criticalLow || temp >= thresholds.criticalHigh
  }),
  transformThresholdsForUtility: vi.fn((model, thresholds) => {
    if (model === CONTAINER_MODEL.MICROBT_THRESHOLD && thresholds.waterTemperature) {
      return { waterTemperature: thresholds.waterTemperature }
    }
    return null
  }),
}))

vi.mock('../../../../../../utils/device-utils', () => ({
  getDeviceData: vi.fn((device) => [null, device]),
}))

describe('micro-bt-utils', () => {
  describe('DEFAULT_MICROBT_TEMP_THRESHOLDS', () => {
    it('has correct default values', () => {
      expect(DEFAULT_MICROBT_TEMP_THRESHOLDS).toEqual({
        COLD: 25,
        LIGHT_WARM: 33,
        WARM: 37,
        HOT: 39,
      })
    })
  })

  describe('MICROBT_WATER_TEMP_MIN_BY_CHARACTER_MAP', () => {
    it('has correct threshold mappings', () => {
      expect(MICROBT_WATER_TEMP_MIN_BY_CHARACTER_MAP).toEqual({
        'Critical Low': -Infinity,
        'Alarm Low': 25,
        Normal: 33,
        'Alarm High': 37,
        'Critical High': 39,
      })
    })
  })

  describe('getMicroBTTempThresholds', () => {
    it('returns default thresholds when no container settings', () => {
      const result = getMicroBTTempThresholds()
      expect(result).toEqual(DEFAULT_MICROBT_TEMP_THRESHOLDS)
    })

    it('returns default thresholds when containerSettings is null', () => {
      const result = getMicroBTTempThresholds(null)
      expect(result).toEqual(DEFAULT_MICROBT_TEMP_THRESHOLDS)
    })

    it('returns default thresholds when containerSettings has no thresholds', () => {
      const result = getMicroBTTempThresholds({})
      expect(result).toEqual(DEFAULT_MICROBT_TEMP_THRESHOLDS)
    })

    it('returns custom thresholds when provided', () => {
      const containerSettings = {
        thresholds: {
          waterTemperature: {
            COLD: 20,
            LIGHT_WARM: 30,
            WARM: 35,
            HOT: 40,
          },
        },
      }

      const result = getMicroBTTempThresholds(containerSettings)

      expect(result).toEqual({
        COLD: 20,
        LIGHT_WARM: 30,
        WARM: 35,
        HOT: 40,
      })
    })

    it('uses defaults for missing custom threshold values', () => {
      const containerSettings = {
        thresholds: {
          waterTemperature: {
            COLD: 20,
            LIGHT_WARM: 30,
          },
        },
      }

      const result = getMicroBTTempThresholds(containerSettings)

      expect(result).toEqual({
        COLD: 20,
        LIGHT_WARM: 30,
        WARM: DEFAULT_MICROBT_TEMP_THRESHOLDS.WARM,
        HOT: DEFAULT_MICROBT_TEMP_THRESHOLDS.HOT,
      })
    })

    it('returns defaults when transformed thresholds have no waterTemperature', () => {
      vi.mocked(transformThresholdsForUtility).mockReturnValueOnce({})

      const result = getMicroBTTempThresholds({ thresholds: {} })

      expect(result).toEqual(DEFAULT_MICROBT_TEMP_THRESHOLDS)
    })
  })

  describe('microBtHasAlarmingValue', () => {
    const mockDevice: Device = {
      id: 'device-1',
      type: 'microbt',
      status: 'active',
    }

    it('detects critical low temperature', () => {
      const result = microBtHasAlarmingValue(20, mockDevice)

      expect(result).toEqual({
        hasAlarm: true,
        isCriticallyHigh: false,
      })
    })

    it('detects critical high temperature', () => {
      const result = microBtHasAlarmingValue(40, mockDevice)

      expect(result).toEqual({
        hasAlarm: true,
        isCriticallyHigh: true,
      })
    })

    it('detects no alarm for normal temperature', () => {
      const result = microBtHasAlarmingValue(30, mockDevice)

      expect(result).toEqual({
        hasAlarm: false,
        isCriticallyHigh: false,
      })
    })

    it('does not alarm when container is stopped', () => {
      const stoppedDevice = { ...mockDevice, status: CONTAINER_STATUS.STOPPED }

      const lowTemp = microBtHasAlarmingValue(20, stoppedDevice)
      const highTemp = microBtHasAlarmingValue(40, stoppedDevice)

      expect(lowTemp.hasAlarm).toBe(false)
      expect(highTemp.hasAlarm).toBe(false)
    })

    it('does not alarm when container is offline', () => {
      const offlineDevice = { ...mockDevice, status: CONTAINER_STATUS.OFFLINE }

      const lowTemp = microBtHasAlarmingValue(20, offlineDevice)
      const highTemp = microBtHasAlarmingValue(40, offlineDevice)

      expect(lowTemp.hasAlarm).toBe(false)
      expect(highTemp.hasAlarm).toBe(false)
    })

    it('uses custom thresholds when provided', () => {
      const containerSettings = {
        thresholds: {
          waterTemperature: {
            COLD: 15,
            LIGHT_WARM: 30,
            WARM: 35,
            HOT: 45,
          },
        },
      }

      const result = microBtHasAlarmingValue(10, mockDevice, containerSettings)

      expect(result.hasAlarm).toBe(true)
    })

    it('handles temperature at exact threshold boundaries', () => {
      const atCold = microBtHasAlarmingValue(25, mockDevice)
      const atHot = microBtHasAlarmingValue(39, mockDevice)

      expect(atCold.hasAlarm).toBe(false) // 25 is not < 25
      expect(atHot.hasAlarm).toBe(true) // 39 >= 39
    })

    it('handles undefined device', () => {
      const result = microBtHasAlarmingValue(40)

      expect(result.hasAlarm).toBe(true)
      expect(result.isCriticallyHigh).toBe(true)
    })
  })

  describe('getMicroBTThresholdSettingsData', () => {
    it('returns threshold settings from device CDU data', () => {
      const mockDevice: Device = {
        id: 'device-1',
        type: 'microbt',
        status: 'active',
        snap: {
          stats: {
            container_specific: {
              cdu: {
                cooling_fan_running_speed_threshold: 1500,
                cooling_fan_start_temperature_threshold: 30,
                cooling_fan_stop_temperature_threshold: 25,
              },
            },
          },
          config: {},
        },
      }

      const result = getMicroBTThresholdSettingsData(mockDevice)

      expect(result).toEqual({
        coolingFanRunningSpeedThreshold: 1500,
        coolingFanStartTemperatureThreshold: 30,
        coolingFanStopTemperatureThreshold: 25,
      })
    })

    it('returns undefined values when CDU data is missing', () => {
      const mockDevice: Device = {
        id: 'device-1',
        type: 'microbt',
        status: 'active',
        snap: {
          stats: {},
          config: {},
        },
      }

      const result = getMicroBTThresholdSettingsData(mockDevice)

      expect(result).toEqual({
        coolingFanRunningSpeedThreshold: undefined,
        coolingFanStartTemperatureThreshold: undefined,
        coolingFanStopTemperatureThreshold: undefined,
      })
    })

    it('returns undefined values when device is undefined', () => {
      const result = getMicroBTThresholdSettingsData()

      expect(result).toEqual({
        coolingFanRunningSpeedThreshold: undefined,
        coolingFanStartTemperatureThreshold: undefined,
        coolingFanStopTemperatureThreshold: undefined,
      })
    })

    it('handles partial CDU data', () => {
      const mockDevice: Device = {
        id: 'device-1',
        type: 'microbt',
        status: 'active',
        snap: {
          stats: {
            container_specific: {
              cdu: {
                cooling_fan_running_speed_threshold: 1500,
              },
            },
          },
          config: {},
        },
      }

      const result = getMicroBTThresholdSettingsData(mockDevice)

      expect(result).toEqual({
        coolingFanRunningSpeedThreshold: 1500,
        coolingFanStartTemperatureThreshold: undefined,
        coolingFanStopTemperatureThreshold: undefined,
      })
    })
  })

  describe('getMicroBtInletTempColor', () => {
    it('returns correct color for very cold temperature', () => {
      const result = getMicroBtInletTempColor(20, true)
      expect(result).toBe('blue')
    })

    it('returns correct color for cold temperature', () => {
      const result = getMicroBtInletTempColor(28, true)
      expect(result).toBe('yellow')
    })

    it('returns correct color for normal temperature', () => {
      const result = getMicroBtInletTempColor(35, true)
      expect(result).toBe('green')
    })

    it('returns correct color for warm temperature', () => {
      const result = getMicroBtInletTempColor(38, true)
      expect(result).toBe('orange')
    })

    it('returns correct color for hot temperature', () => {
      const result = getMicroBtInletTempColor(42, true)
      expect(result).toBe('red')
    })

    it('returns gray when cooling is disabled', () => {
      const result = getMicroBtInletTempColor(35, false)
      expect(result).toBe('gray')
    })

    it('uses custom thresholds when provided', () => {
      const containerSettings = {
        thresholds: {
          waterTemperature: {
            COLD: 15,
            LIGHT_WARM: 25,
            WARM: 30,
            HOT: 35,
          },
        },
      }

      getMicroBtInletTempColor(28, true, containerSettings)

      expect(getColorFromThresholds).toHaveBeenCalledWith(
        28,
        expect.objectContaining({
          criticalLow: 15,
          normal: 25,
          alarmHigh: 30,
          criticalHigh: 35,
        }),
        false,
      )
    })

    it('calls getColorFromThresholds with correct parameters', () => {
      getMicroBtInletTempColor(30, true)

      expect(getColorFromThresholds).toHaveBeenCalledWith(
        30,
        {
          criticalLow: 25,
          alarmLow: 25,
          normal: 33,
          alarmHigh: 37,
          criticalHigh: 39,
        },
        false,
      )
    })
  })

  describe('shouldMicroBtTemperatureFlash', () => {
    const mockDevice: Device = {
      id: 'device-1',
      type: 'microbt',
      status: 'active',
    }

    it('returns false when cooling is disabled', () => {
      const result = shouldMicroBtTemperatureFlash(40, false, mockDevice)
      expect(result).toBe(false)
    })

    it('returns true for critical low temperature', () => {
      const result = shouldMicroBtTemperatureFlash(20, true, mockDevice)
      expect(result).toBe(true)
    })

    it('returns true for critical high temperature', () => {
      const result = shouldMicroBtTemperatureFlash(42, true, mockDevice)
      expect(result).toBe(true)
    })

    it('returns false for normal temperature', () => {
      vi.mocked(getShouldFlashFromThresholds).mockReturnValueOnce(false)

      const result = shouldMicroBtTemperatureFlash(30, true, mockDevice)
      expect(result).toBe(false)
    })

    it('returns false for stopped container', () => {
      const stoppedDevice = { ...mockDevice, status: CONTAINER_STATUS.STOPPED }

      const result = shouldMicroBtTemperatureFlash(42, true, stoppedDevice)
      expect(result).toBe(false)
    })

    it('returns false for offline container', () => {
      const offlineDevice = { ...mockDevice, status: CONTAINER_STATUS.OFFLINE }

      const result = shouldMicroBtTemperatureFlash(42, true, offlineDevice)
      expect(result).toBe(false)
    })

    it('uses custom thresholds when provided', () => {
      const containerSettings = {
        thresholds: {
          waterTemperature: {
            COLD: 15,
            LIGHT_WARM: 25,
            WARM: 30,
            HOT: 35,
          },
        },
      }

      shouldMicroBtTemperatureFlash(10, true, mockDevice, containerSettings)

      expect(getShouldFlashFromThresholds).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          criticalLow: 15,
          criticalHigh: 35,
        }),
        'active',
      )
    })

    it('handles undefined device', () => {
      vi.mocked(getShouldFlashFromThresholds).mockReturnValueOnce(true)

      const result = shouldMicroBtTemperatureFlash(42, true)
      expect(result).toBe(true)
    })
  })

  describe('shouldMicroBtTemperatureSuperflash', () => {
    const mockDevice: Device = {
      id: 'device-1',
      type: 'microbt',
      status: 'active',
    }

    it('returns true for critical low temperature', () => {
      const result = shouldMicroBtTemperatureSuperflash(20, mockDevice)
      expect(result).toBe(true)
    })

    it('returns true for critical high temperature', () => {
      const result = shouldMicroBtTemperatureSuperflash(42, mockDevice)
      expect(result).toBe(true)
    })

    it('returns false for normal temperature', () => {
      const result = shouldMicroBtTemperatureSuperflash(30, mockDevice)
      expect(result).toBe(false)
    })

    it('returns false for stopped container', () => {
      const stoppedDevice = { ...mockDevice, status: CONTAINER_STATUS.STOPPED }

      const result = shouldMicroBtTemperatureSuperflash(42, stoppedDevice)
      expect(result).toBe(false)
    })

    it('returns false for offline container', () => {
      const offlineDevice = { ...mockDevice, status: CONTAINER_STATUS.OFFLINE }

      const result = shouldMicroBtTemperatureSuperflash(42, offlineDevice)
      expect(result).toBe(false)
    })

    it('uses custom thresholds when provided', () => {
      const containerSettings = {
        thresholds: {
          waterTemperature: {
            COLD: 15,
            LIGHT_WARM: 25,
            WARM: 30,
            HOT: 45,
          },
        },
      }

      const lowResult = shouldMicroBtTemperatureSuperflash(10, mockDevice, containerSettings)
      const highResult = shouldMicroBtTemperatureSuperflash(50, mockDevice, containerSettings)

      expect(lowResult).toBe(true)
      expect(highResult).toBe(true)
    })

    it('handles temperature at exact threshold boundaries', () => {
      const atCold = shouldMicroBtTemperatureSuperflash(25, mockDevice)
      const atHot = shouldMicroBtTemperatureSuperflash(39, mockDevice)

      expect(atCold).toBe(false)
      expect(atHot).toBe(true)
    })

    it('handles undefined device', () => {
      const result = shouldMicroBtTemperatureSuperflash(42)
      expect(result).toBe(true)
    })

    it('matches microBtHasAlarmingValue logic', () => {
      const temps = [15, 20, 25, 30, 35, 38, 39, 42, 50]

      temps.forEach((temp) => {
        const superflash = shouldMicroBtTemperatureSuperflash(temp, mockDevice)
        const alarming = microBtHasAlarmingValue(temp, mockDevice)

        expect(superflash).toBe(alarming.hasAlarm)
      })
    })
  })

  describe('integration tests', () => {
    const mockDevice: Device = {
      id: 'device-1',
      type: 'microbt',
      status: 'active',
      snap: {
        stats: {
          container_specific: {
            cdu: {
              cooling_fan_running_speed_threshold: 1500,
              cooling_fan_start_temperature_threshold: 30,
              cooling_fan_stop_temperature_threshold: 25,
            },
          },
        },
        config: {},
      },
    }

    const containerSettings = {
      thresholds: {
        waterTemperature: {
          COLD: 20,
          LIGHT_WARM: 28,
          WARM: 32,
          HOT: 38,
        },
      },
    }

    it('uses consistent custom thresholds across all functions', () => {
      const temp = 35

      const thresholds = getMicroBTTempThresholds(containerSettings)
      const color = getMicroBtInletTempColor(temp, true, containerSettings)
      const shouldFlash = shouldMicroBtTemperatureFlash(temp, true, mockDevice, containerSettings)
      const shouldSuperflash = shouldMicroBtTemperatureSuperflash(
        temp,
        mockDevice,
        containerSettings,
      )

      expect(thresholds.COLD).toBe(20)
      expect(thresholds.HOT).toBe(38)
      expect(color).toBeDefined()
      expect(shouldFlash).toBeDefined()
      expect(shouldSuperflash).toBeDefined()
    })

    it('handles complete workflow with default settings', () => {
      const settingsData = getMicroBTThresholdSettingsData(mockDevice)
      const thresholds = getMicroBTTempThresholds()

      expect(settingsData.coolingFanRunningSpeedThreshold).toBe(1500)
      expect(thresholds).toEqual(DEFAULT_MICROBT_TEMP_THRESHOLDS)
    })
  })
})
