import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Device } from '@/types/device'
import {
  getColorFromThresholds,
  getShouldFlashFromThresholds,
  getShouldFlashWidgetFromThresholds,
  transformThresholdsForUtility,
} from '@/utils/container-threshold-utils'
import { CONTAINER_STATUS } from '@/utils/status-utils'
import {
  BITMAIN_IMMERSION_OIL_TEMP_MIN_BY_CHARACTER_MAP,
  getImmersionTemperatureColor,
  immersionHasAlarmingValue,
  shouldImmersionTemperatureFlash,
  shouldImmersionTemperatureSuperflash,
} from '../bitmain-immersion-utils'

// Mock dependencies
vi.mock('@/utils/container-threshold-utils', () => ({
  getColorFromThresholds: vi.fn((temp, thresholds) => {
    if (temp < thresholds.criticalLow) return 'red'
    if (temp < thresholds.alert) return 'red'
    if (temp < thresholds.normal) return 'yellow'
    if (temp < thresholds.alarm) return 'green'
    if (temp < thresholds.criticalHigh) return 'orange'
    return 'red'
  }),
  getShouldFlashFromThresholds: vi.fn((temp, thresholds) => {
    return temp < thresholds.criticalLow || temp >= thresholds.criticalHigh
  }),
  getShouldFlashWidgetFromThresholds: vi.fn((temp, thresholds) => {
    return temp < thresholds.criticalLow || temp >= thresholds.criticalHigh
  }),
  transformThresholdsForUtility: vi.fn((model, thresholds) => {
    if (thresholds?.custom) {
      return {
        oilTemperature: {
          COLD: 30,
          LIGHT_WARM: 40,
          WARM: 45,
          HOT: 50,
          SUPERHOT: 55,
        },
      }
    }
    return null
  }),
}))

describe('bitmain-immersion-utils', () => {
  const mockDevice: Device = {
    id: 'device-1',
    type: 'bitmain-immersion',
    status: 'active',
    last: {
      snap: {
        stats: {
          primary_supply_temp: 40,
          second_supply_temp1: 38,
          second_supply_temp2: 39,
          primary_circulating_pump: false,
        },
        config: {},
      },
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('BITMAIN_IMMERSION_OIL_TEMP_MIN_BY_CHARACTER_MAP', () => {
    it('has correct threshold mappings', () => {
      expect(BITMAIN_IMMERSION_OIL_TEMP_MIN_BY_CHARACTER_MAP).toEqual({
        'Critical Low': -Infinity,
        Alert: 33,
        Normal: 42,
        Alarm: 46,
        'Critical High': 48,
      })
    })
  })

  describe('getImmersionTemperatureColor', () => {
    it('returns color for normal temperature with default thresholds', () => {
      const color = getImmersionTemperatureColor(40, 'active', null)

      expect(getColorFromThresholds).toHaveBeenCalledWith(
        40,
        {
          criticalLow: 33,
          alert: 33,
          normal: 42,
          alarm: 46,
          criticalHigh: 48,
        },
        false,
        'active',
      )
      expect(color).toBe('yellow')
    })

    it('returns color for critical low temperature', () => {
      const color = getImmersionTemperatureColor(30, 'active', null)
      expect(color).toBe('red')
    })

    it('returns color for critical high temperature', () => {
      const color = getImmersionTemperatureColor(50, 'active', null)
      expect(color).toBe('red')
    })
  })

  describe('shouldImmersionTemperatureFlash', () => {
    it('returns true for critical low temperature', () => {
      const shouldFlash = shouldImmersionTemperatureFlash(30, 'active', null)

      expect(getShouldFlashFromThresholds).toHaveBeenCalledWith(
        30,
        {
          criticalLow: 33,
          alert: 33,
          normal: 42,
          alarm: 46,
          criticalHigh: 48,
        },
        'active',
      )
      expect(shouldFlash).toBe(true)
    })

    it('returns true for critical high temperature', () => {
      const shouldFlash = shouldImmersionTemperatureFlash(50, 'active', null)
      expect(shouldFlash).toBe(true)
    })

    it('returns false for normal temperature', () => {
      const shouldFlash = shouldImmersionTemperatureFlash(40, 'active', null)
      expect(shouldFlash).toBe(false)
    })
  })

  describe('shouldImmersionTemperatureSuperflash', () => {
    it('returns true for critical low temperature', () => {
      const shouldFlash = shouldImmersionTemperatureSuperflash(30, 'active', null)

      expect(getShouldFlashWidgetFromThresholds).toHaveBeenCalledWith(
        30,
        {
          criticalLow: 33,
          alert: 33,
          normal: 42,
          alarm: 46,
          criticalHigh: 48,
        },
        'active',
      )
      expect(shouldFlash).toBe(true)
    })

    it('returns true for critical high temperature', () => {
      const shouldFlash = shouldImmersionTemperatureSuperflash(50, 'active', null)
      expect(shouldFlash).toBe(true)
    })

    it('returns false for normal temperature', () => {
      const shouldFlash = shouldImmersionTemperatureSuperflash(40, 'active', null)
      expect(shouldFlash).toBe(false)
    })
  })

  describe('immersionHasAlarmingValue', () => {
    it('returns no alarm for normal temperatures', () => {
      const result = immersionHasAlarmingValue(mockDevice, null)

      expect(result).toEqual({
        hasAlarm: false,
        isCriticallyHigh: false,
      })
    })

    it('detects critical low temperature', () => {
      const deviceWithLowTemp = {
        ...mockDevice,
        last: {
          snap: {
            stats: {
              primary_supply_temp: 30,
              second_supply_temp1: 38,
              second_supply_temp2: 39,
              primary_circulating_pump: false,
            },
            config: {},
          },
        },
      }

      const result = immersionHasAlarmingValue(deviceWithLowTemp, null)

      expect(result).toEqual({
        hasAlarm: true,
        isCriticallyHigh: false,
      })
    })

    it('detects critical high temperature', () => {
      const deviceWithHighTemp = {
        ...mockDevice,
        last: {
          snap: {
            stats: {
              primary_supply_temp: 50,
              second_supply_temp1: 38,
              second_supply_temp2: 39,
              primary_circulating_pump: false,
            },
            config: {},
          },
        },
      }

      const result = immersionHasAlarmingValue(deviceWithHighTemp, null)

      expect(result).toEqual({
        hasAlarm: true,
        isCriticallyHigh: true,
      })
    })

    it('detects primary circulating pump alarm', () => {
      const deviceWithPumpAlarm = {
        ...mockDevice,
        last: {
          snap: {
            stats: {
              primary_supply_temp: 40,
              second_supply_temp1: 38,
              second_supply_temp2: 39,
              primary_circulating_pump: true,
            },
            config: {},
          },
        },
      }

      const result = immersionHasAlarmingValue(deviceWithPumpAlarm, null)

      expect(result).toEqual({
        hasAlarm: true,
        isCriticallyHigh: false,
      })
    })

    it('ignores alarms when container is stopped', () => {
      const stoppedDevice = {
        ...mockDevice,
        status: CONTAINER_STATUS.STOPPED,
        last: {
          snap: {
            stats: {
              primary_supply_temp: 30,
              second_supply_temp1: 38,
              second_supply_temp2: 39,
              primary_circulating_pump: false,
            },
            config: {},
          },
        },
      }

      const result = immersionHasAlarmingValue(stoppedDevice, null)

      expect(result).toEqual({
        hasAlarm: false,
        isCriticallyHigh: false,
      })
    })

    it('ignores alarms when container is offline', () => {
      const offlineDevice = {
        ...mockDevice,
        status: CONTAINER_STATUS.OFFLINE,
        last: {
          snap: {
            stats: {
              primary_supply_temp: 50,
              second_supply_temp1: 38,
              second_supply_temp2: 39,
              primary_circulating_pump: false,
            },
            config: {},
          },
        },
      }

      const result = immersionHasAlarmingValue(offlineDevice, null)

      expect(result).toEqual({
        hasAlarm: false,
        isCriticallyHigh: false,
      })
    })

    it('checks all temperature sensors', () => {
      const deviceWithTemp2Low = {
        ...mockDevice,
        last: {
          snap: {
            stats: {
              primary_supply_temp: 40,
              second_supply_temp1: 38,
              second_supply_temp2: 30,
              primary_circulating_pump: false,
            },
            config: {},
          },
        },
      }

      const result = immersionHasAlarmingValue(deviceWithTemp2Low, null)

      expect(result).toEqual({
        hasAlarm: true,
        isCriticallyHigh: false,
      })
    })

    it('handles missing temperature values', () => {
      const deviceWithMissingTemps = {
        ...mockDevice,
        last: {
          snap: {
            stats: {
              primary_circulating_pump: false,
            },
            config: {},
          },
        },
      }

      const result = immersionHasAlarmingValue(deviceWithMissingTemps, null)

      expect(result).toEqual({
        hasAlarm: false,
        isCriticallyHigh: false,
      })
    })

    it('handles null/undefined stats', () => {
      const deviceWithNoStats = {
        ...mockDevice,
        last: {
          snap: {
            stats: undefined,
            config: {},
          },
        },
      }

      const result = immersionHasAlarmingValue(deviceWithNoStats as any, null)

      expect(result).toEqual({
        hasAlarm: false,
        isCriticallyHigh: false,
      })
    })

    it('handles NaN temperature values', () => {
      const deviceWithNaN = {
        ...mockDevice,
        last: {
          snap: {
            stats: {
              primary_supply_temp: Number.NaN,
              second_supply_temp1: 38,
              second_supply_temp2: 39,
              primary_circulating_pump: false,
            },
            config: {},
          },
        },
      }

      const result = immersionHasAlarmingValue(deviceWithNaN, null)

      expect(result).toEqual({
        hasAlarm: false,
        isCriticallyHigh: false,
      })
    })

    it('handles non-number temperature values', () => {
      const deviceWithInvalidTemp = {
        ...mockDevice,
        last: {
          snap: {
            stats: {
              primary_supply_temp: 'invalid' as any,
              second_supply_temp1: 38,
              second_supply_temp2: 39,
              primary_circulating_pump: false,
            },
            config: {},
          },
        },
      }

      const result = immersionHasAlarmingValue(deviceWithInvalidTemp, null)

      expect(result).toEqual({
        hasAlarm: false,
        isCriticallyHigh: false,
      })
    })

    it('uses custom thresholds', () => {
      const customSettings = {
        thresholds: {
          custom: true,
        },
      }

      const deviceWithCustomThresholds = {
        ...mockDevice,
        last: {
          snap: {
            stats: {
              primary_supply_temp: 56,
              second_supply_temp1: 38,
              second_supply_temp2: 39,
              primary_circulating_pump: false,
            },
            config: {},
          },
        },
      }

      const result = immersionHasAlarmingValue(deviceWithCustomThresholds, customSettings)

      expect(result).toEqual({
        hasAlarm: true,
        isCriticallyHigh: true,
      })
    })

    it('handles undefined SUPERHOT threshold', () => {
      vi.mocked(transformThresholdsForUtility).mockReturnValueOnce({
        oilTemperature: {
          COLD: 30,
          LIGHT_WARM: 40,
          WARM: 45,
          HOT: 50,
          // SUPERHOT is undefined
        },
      })

      const deviceWithHighTemp = {
        ...mockDevice,
        last: {
          snap: {
            stats: {
              primary_supply_temp: 60,
              second_supply_temp1: 38,
              second_supply_temp2: 39,
              primary_circulating_pump: false,
            },
            config: {},
          },
        },
      }

      const result = immersionHasAlarmingValue(deviceWithHighTemp, {
        thresholds: { custom: true },
      })

      // Should not trigger critical high if SUPERHOT is undefined
      expect(result).toEqual({
        hasAlarm: false,
        isCriticallyHigh: false,
      })
    })

    it('detects alarm when pump alarm is truthy value', () => {
      const deviceWithPumpAlarm = {
        ...mockDevice,
        last: {
          snap: {
            stats: {
              primary_supply_temp: 40,
              second_supply_temp1: 38,
              second_supply_temp2: 39,
              primary_circulating_pump: 1 as any,
            },
            config: {},
          },
        },
      }

      const result = immersionHasAlarmingValue(deviceWithPumpAlarm, null)

      expect(result.hasAlarm).toBe(true)
    })
  })
})
