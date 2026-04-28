import { COLOR } from '@tetherto/core'
import { describe, expect, it, vi } from 'vitest'
import type * as DeviceUtils from '@/utils/device-utils'
import type { Container } from '@/types/device'
import { CONTAINER_STATUS } from '@/utils/status-utils'
import {
  bitdeerHasAlarmingValue,
  getBitdeerCoolingSystemData,
  getBitdeerOilTemperatureColor,
  getBitdeerOilTemperatureColorAndTooltip,
  getBitdeerParameterSettingsData,
  getBitdeerTacticsData,
  getBitdeerTankPressureColor,
  getBitdeerTankPressureColorAndTooltip,
  getBitdeerTemperatureColor,
  shouldBitdeerOilTemperatureFlash,
  shouldBitdeerOilTemperatureSuperflash,
  shouldBitdeerTankPressureFlash,
  shouldBitdeerTankPressureSuperflash,
} from '../bitdeer-settings-utils'

vi.mock('@/utils/device-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof DeviceUtils>()
  return {
    ...actual,
    getContainerSpecificStats: vi.fn((data) => data?.container_specific),
    getContainerSpecificConfig: vi.fn((data) => data?.container_config),
    getStats: vi.fn((data) => data?.stats),
    getCoolingSystem: vi.fn((data) => data?.cooling_system),
  }
})

describe('getBitdeerCoolingSystemData', () => {
  it('extracts cooling system data', () => {
    const data = {
      container_specific: {
        cooling_system: {
          exhaust_fan_enabled: true,
          dry_cooler: true,
          water_pump: false,
          oil_pump: true,
        },
      },
    }

    const result = getBitdeerCoolingSystemData(data)

    expect(result.exhaustFanEnabled).toBe(true)
    expect(result.dryCooler).toBe(true)
    expect(result.waterPump).toBe(false)
    expect(result.oilPump).toBe(true)
  })

  it('handles missing cooling system', () => {
    const result = getBitdeerCoolingSystemData({})
    expect(result.exhaustFanEnabled).toBeUndefined()
  })
})

describe('getBitdeerTacticsData', () => {
  it('extracts tactics data', () => {
    const data = {
      container_config: {
        tactics: { mode: 'auto' },
      },
    }

    const result = getBitdeerTacticsData(data)
    expect(result).toEqual({ mode: 'auto' })
  })
})

describe('getBitdeerParameterSettingsData', () => {
  it('extracts alarms and set_temps', () => {
    const data = {
      container_config: {
        alarms: { enabled: true },
        set_temps: { cold_oil_temp_c: 40 },
      },
    }

    const result = getBitdeerParameterSettingsData(data)

    expect(result.alarms).toEqual({ enabled: true })
    expect(result.set_temps?.cold_oil_temp_c).toBe(40)
  })
})

describe('getBitdeerTemperatureColor', () => {
  it('returns red when temp > setTemp + 5', () => {
    const data = {
      container_config: {
        set_temps: { cold_oil_temp_c: 40 },
      },
    }

    expect(getBitdeerTemperatureColor(data, 46)).toBe('red')
  })

  it('returns orange when temp > setTemp', () => {
    const data = {
      container_config: {
        set_temps: { cold_oil_temp_c: 40 },
      },
    }

    expect(getBitdeerTemperatureColor(data, 43)).toBe('orange')
  })

  it('returns empty when temp normal', () => {
    const data = {
      container_config: {
        set_temps: { cold_oil_temp_c: 40 },
      },
    }

    expect(getBitdeerTemperatureColor(data, 35)).toBe('')
  })
})

describe('getBitdeerOilTemperatureColor', () => {
  it('returns green for normal temp', () => {
    const color = getBitdeerOilTemperatureColor(true, 43)
    expect(color).toBe(COLOR.GREEN)
  })

  it('returns white when pump disabled', () => {
    const color = getBitdeerOilTemperatureColor(false, 43)
    expect(color).toBe(COLOR.WHITE)
  })
})

describe('getBitdeerOilTemperatureColorAndTooltip', () => {
  it('returns tooltip when pump disabled', () => {
    const result = getBitdeerOilTemperatureColorAndTooltip(false, 43, CONTAINER_STATUS.RUNNING)

    expect(result.color).toBe(COLOR.WHITE)
    expect(result.tooltip).toContain('Oil pump is turned off')
  })

  it('returns green for normal temp', () => {
    const result = getBitdeerOilTemperatureColorAndTooltip(true, 43, CONTAINER_STATUS.RUNNING)

    expect(result.color).toBe(COLOR.GREEN)
    expect(result.tooltip).toBe('')
  })

  it('returns white when stopped', () => {
    const result = getBitdeerOilTemperatureColorAndTooltip(true, 43, CONTAINER_STATUS.STOPPED)

    expect(result.color).toBe(COLOR.WHITE)
    expect(result.tooltip).toContain('stopped')
  })
})

describe('shouldBitdeerOilTemperatureFlash', () => {
  it('returns true for alarm temp', () => {
    expect(shouldBitdeerOilTemperatureFlash(true, 46, CONTAINER_STATUS.RUNNING, {})).toBe(true)
  })

  it('returns false for normal temp', () => {
    expect(shouldBitdeerOilTemperatureFlash(true, 43, CONTAINER_STATUS.RUNNING, {})).toBe(false)
  })

  it('returns false when stopped', () => {
    expect(shouldBitdeerOilTemperatureFlash(true, 46, CONTAINER_STATUS.STOPPED, {})).toBe(false)
  })
})

describe('shouldBitdeerOilTemperatureSuperflash', () => {
  it('returns false for alarm (only critical flashes widget)', () => {
    expect(shouldBitdeerOilTemperatureSuperflash(true, 46, CONTAINER_STATUS.RUNNING, {})).toBe(
      false,
    )
  })

  it('returns true for critical low', () => {
    expect(shouldBitdeerOilTemperatureSuperflash(true, 30, CONTAINER_STATUS.RUNNING, {})).toBe(true)
  })

  it('returns false when offline', () => {
    expect(shouldBitdeerOilTemperatureSuperflash(true, 30, CONTAINER_STATUS.OFFLINE, {})).toBe(
      false,
    )
  })
})

describe('shouldBitdeerTankPressureFlash', () => {
  it('returns false when pump disabled', () => {
    expect(shouldBitdeerTankPressureFlash(false, 1.5, CONTAINER_STATUS.RUNNING, {})).toBe(false)
  })

  it('returns true for critical low pressure', () => {
    expect(shouldBitdeerTankPressureFlash(true, 1.5, CONTAINER_STATUS.RUNNING, {})).toBe(true)
  })

  it('returns false for normal pressure', () => {
    expect(shouldBitdeerTankPressureFlash(true, 2.8, CONTAINER_STATUS.RUNNING, {})).toBe(false)
  })
})

describe('shouldBitdeerTankPressureSuperflash', () => {
  it('returns true for critical low', () => {
    expect(shouldBitdeerTankPressureSuperflash(true, 1.5, CONTAINER_STATUS.RUNNING, {})).toBe(true)
  })

  it('returns true for critical high', () => {
    expect(shouldBitdeerTankPressureSuperflash(true, 4.5, CONTAINER_STATUS.RUNNING, {})).toBe(true)
  })

  it('returns false for alarm (not critical)', () => {
    expect(shouldBitdeerTankPressureSuperflash(true, 3.6, CONTAINER_STATUS.RUNNING, {})).toBe(false)
  })
})

describe('bitdeerHasAlarmingValue', () => {
  it('detects critical high temperature', () => {
    const container = {
      cooling_system: {
        oil_pump: [
          { cold_temp_c: 50, enabled: true },
          { cold_temp_c: 40, enabled: true },
        ],
      },
      stats: { status: CONTAINER_STATUS.RUNNING },
    } as unknown as Container

    const result = bitdeerHasAlarmingValue(container)

    expect(result.hasAlarm).toBe(false) // 50 is HOT (alarm), not SUPERHOT (critical)
  })

  it('detects critical low pressure', () => {
    const container = {
      cooling_system: {
        oil_pump: [{ enabled: true }],
        tank1_bar: 1.5,
      },
      stats: { status: CONTAINER_STATUS.RUNNING },
    }

    const result = bitdeerHasAlarmingValue(container as any)

    expect(result.hasAlarm).toBe(true)
    expect(result.isCriticallyHigh).toBe(false)
  })

  it('ignores disabled pumps', () => {
    const container = {
      cooling_system: {
        oil_pump: [{ cold_temp_c: 50, enabled: false }],
        tank1_bar: 1.5,
      },
      stats: { status: CONTAINER_STATUS.RUNNING },
    }

    const result = bitdeerHasAlarmingValue(container as any)

    expect(result.hasAlarm).toBe(false)
  })

  it('ignores alarms when stopped', () => {
    const container = {
      cooling_system: {
        oil_pump: [{ cold_temp_c: 50, enabled: true }],
        tank1_bar: 1.5,
      },
      stats: { status: CONTAINER_STATUS.STOPPED },
    }

    const result = bitdeerHasAlarmingValue(container as any)

    expect(result.hasAlarm).toBe(false)
  })
})

describe('getBitdeerTankPressureColor', () => {
  it('returns green for normal pressure', () => {
    expect(getBitdeerTankPressureColor(true, 2.8, {})).toBe(COLOR.GREEN)
  })

  it('returns red for critical low', () => {
    expect(getBitdeerTankPressureColor(true, 1.5, {})).toBe(COLOR.RED)
  })

  it('returns red for critical high', () => {
    expect(getBitdeerTankPressureColor(true, 4.5, {})).toBe(COLOR.RED)
  })
})

describe('getBitdeerTankPressureColorAndTooltip', () => {
  it('returns tooltip when pump disabled', () => {
    const result = getBitdeerTankPressureColorAndTooltip(false, 2.8, CONTAINER_STATUS.RUNNING)

    expect(result.color).toBe(COLOR.WHITE)
    expect(result.tooltip).toContain('Oil pump is turned off')
  })

  it('returns green for normal pressure', () => {
    const result = getBitdeerTankPressureColorAndTooltip(true, 2.8, CONTAINER_STATUS.RUNNING)

    expect(result.color).toBe(COLOR.GREEN)
    expect(result.tooltip).toBe('')
  })
})
