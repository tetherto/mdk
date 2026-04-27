import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Device } from '@/types/device'
import { getDeviceData } from '@/utils/device-utils'
import {
  antspaceHydroHasAlarmingValue,
  BITMAIN_HYDRO_SUPPLY_LIQUID_PRESSURE_MIN_BY_CHARACTER_MAP,
  BITMAIN_HYDRO_WATER_TEMP_MIN_BY_CHARACTER_MAP,
  getAntspaceSupplyLiquidPressureColor,
  getAntspaceSupplyLiquidTemperatureColor,
  shouldAntspacePressureFlash,
  shouldAntspacePressureSuperflash,
  shouldAntspaceSupplyLiquidTempFlash,
  shouldAntspaceSupplyLiquidTempSuperflash,
} from '../bitmain-hydro-utils'

// Mock dependencies
vi.mock('@/utils/container-threshold-utils', () => ({
  getColorFromThresholds: vi.fn((value) => (value > 50 ? 'red' : 'green')),
  getShouldFlashFromThresholds: vi.fn((value) => value > 55),
  getShouldFlashWidgetFromThresholds: vi.fn((value) => value > 60),
  transformThresholdsForUtility: vi.fn(() => ({})),
}))

vi.mock('@/utils/device-utils', () => ({
  getDeviceData: vi.fn((data) => [
    undefined,
    {
      snap: {
        stats: {
          status: data?.status || 'active',
        },
      },
    },
  ]),
}))

const mockDevice: Device = {
  id: 'device-1',
  type: 'bitmain-hydro',
  status: 'active',
  last: {
    snap: {
      stats: {
        water_temperature: 45,
        supply_liquid_pressure: 1.8,
      },
    },
  },
}

describe('bitmain-hydro-settings.utils', () => {
  beforeEach(() => {
    // Default mock implementation
    vi.mocked(getDeviceData).mockReturnValue([
      undefined,
      {
        snap: {
          stats: {
            status: 'active',
          },
          config: {},
        },
        id: '',
        type: '',
      },
    ])
  })

  describe('constants', () => {
    it('should have correct water temp thresholds', () => {
      expect(BITMAIN_HYDRO_WATER_TEMP_MIN_BY_CHARACTER_MAP).toMatchObject({
        'Critical Low': -Infinity,
        'Alarm Low': 21,
        Alert: 25,
        Normal: 30,
        'Alarm High': 37,
        'Critical High': 40,
      })
    })

    it('should have correct pressure thresholds', () => {
      expect(BITMAIN_HYDRO_SUPPLY_LIQUID_PRESSURE_MIN_BY_CHARACTER_MAP).toMatchObject({
        'Critical Low': -Infinity,
        'Alarm Low': 2,
        Normal: 2.3,
        'Alarm High': 3.5,
        'Critical High': 4,
      })
    })
  })

  describe('getAntspaceSupplyLiquidTemperatureColor', () => {
    it('should return color for valid temperature', () => {
      const color = getAntspaceSupplyLiquidTemperatureColor(45, 'active', mockDevice)
      expect(color).toBeDefined()
    })

    it('should handle undefined data', () => {
      const color = getAntspaceSupplyLiquidTemperatureColor(45)
      expect(color).toBeDefined()
    })
  })

  describe('getAntspaceSupplyLiquidPressureColor', () => {
    it('should return color for valid pressure', () => {
      const color = getAntspaceSupplyLiquidPressureColor(2.5, 'active', mockDevice)
      expect(color).toBeDefined()
    })
  })

  describe('shouldAntspacePressureFlash', () => {
    it('should return boolean for valid pressure', () => {
      const result = shouldAntspacePressureFlash(2.5, 'active', mockDevice)
      expect(typeof result).toBe('boolean')
    })

    it('should return false for null pressure', () => {
      const result = shouldAntspacePressureFlash(null as any, 'active', mockDevice)
      expect(result).toBe(false)
    })

    it('should return false for NaN pressure', () => {
      const result = shouldAntspacePressureFlash(Number.NaN, 'active', mockDevice)
      expect(result).toBe(false)
    })
  })

  describe('shouldAntspacePressureSuperflash', () => {
    it('should return boolean for valid pressure', () => {
      const result = shouldAntspacePressureSuperflash(3.0, 'active', mockDevice)
      expect(typeof result).toBe('boolean')
    })
  })

  describe('shouldAntspaceSupplyLiquidTempFlash', () => {
    it('should return boolean for valid temperature', () => {
      const result = shouldAntspaceSupplyLiquidTempFlash(50, 'active', mockDevice)
      expect(typeof result).toBe('boolean')
    })
  })

  describe('shouldAntspaceSupplyLiquidTempSuperflash', () => {
    it('should return boolean for valid temperature', () => {
      const result = shouldAntspaceSupplyLiquidTempSuperflash(65, 'active', mockDevice)
      expect(typeof result).toBe('boolean')
    })
  })

  describe('antspaceHydroHasAlarmingValue', () => {
    it('should detect no alarm for normal values', () => {
      const result = antspaceHydroHasAlarmingValue(30, 32, 2.5, 2.6, mockDevice)
      expect(result).toEqual({ hasAlarm: false, isCriticallyHigh: false })
    })

    it('should detect high temperature alarm', () => {
      const result = antspaceHydroHasAlarmingValue(45, 45, 2.5, 2.6, mockDevice)
      expect(result).toEqual({ hasAlarm: true, isCriticallyHigh: true })
    })

    it('should detect low temperature alarm', () => {
      const result = antspaceHydroHasAlarmingValue(15, 18, 2.5, 2.6, mockDevice)
      expect(result).toEqual({ hasAlarm: true, isCriticallyHigh: false })
    })

    it('should detect high pressure alarm', () => {
      const result = antspaceHydroHasAlarmingValue(30, 32, 4.5, 4.2, mockDevice)
      expect(result).toEqual({ hasAlarm: true, isCriticallyHigh: true })
    })

    it('should detect low pressure alarm', () => {
      const result = antspaceHydroHasAlarmingValue(30, 32, 1.5, 1.8, mockDevice)
      expect(result).toEqual({ hasAlarm: true, isCriticallyHigh: false })
    })

    it('should not alarm for stopped container', () => {
      // Mock getDeviceData to return stopped status
      vi.mocked(getDeviceData).mockReturnValueOnce([
        undefined,
        {
          snap: {
            stats: {
              status: 'stopped',
            },
            config: {},
          },
          id: '',
          type: '',
        },
      ])
      const stoppedDevice = { ...mockDevice, status: 'stopped' }
      const result = antspaceHydroHasAlarmingValue(45, 45, 4.5, 4.2, stoppedDevice)
      expect(result).toEqual({ hasAlarm: false, isCriticallyHigh: false })
    })

    it('should not alarm for offline container', () => {
      vi.mocked(getDeviceData).mockReturnValueOnce([
        undefined,
        {
          snap: {
            stats: {
              status: 'offline',
            },
            config: {},
          },
          id: '',
          type: '',
        },
      ])
      const offlineDevice = { ...mockDevice, status: 'offline' }
      const result = antspaceHydroHasAlarmingValue(45, 45, 4.5, 4.2, offlineDevice)
      expect(result).toEqual({ hasAlarm: false, isCriticallyHigh: false })
    })

    it('should handle undefined data', () => {
      const result = antspaceHydroHasAlarmingValue(30, 32, 2.5, 2.6)
      expect(result).toHaveProperty('hasAlarm')
      expect(result).toHaveProperty('isCriticallyHigh')
    })
  })
})
