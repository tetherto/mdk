import { COLOR } from '@mdk/core'
import { describe, expect, it } from 'vitest'
import { CONTAINER_STATUS, THRESHOLD_LEVEL } from '../status-utils'

import {
  getDefaultThresholdStructure,
  prepareContainerSettingsPayload,
  transformContainerThresholds,
} from '../container-settings-utils'
import type { ContainerSetting } from '../container-threshold-utils'
import {
  evaluateThresholdState,
  findMatchingContainer,
  getColorAndTooltipFromThresholds,
  getColorFromThresholds,
  getDynamicThresholds,
  getShouldFlashFromThresholds,
  getShouldFlashWidgetFromThresholds,
  THRESHOLD_KEY_MAPPINGS,
  transformThresholdsForUtility,
} from '../container-threshold-utils'

describe('container threshold utils', () => {
  describe('evaluateThresholdState', () => {
    const thresholds = {
      criticalLow: 10,
      alert: 20,
      normal: 30,
      alarm: 40,
      criticalHigh: 50,
    }

    it('returns normal for null/undefined values', () => {
      const result = evaluateThresholdState(null, thresholds)
      expect(result.state).toBe(THRESHOLD_LEVEL.NORMAL)
      expect(result.color).toBe(COLOR.GREEN)
    })

    it('detects critical high', () => {
      const result = evaluateThresholdState(55, thresholds)
      expect(result.state).toBe(THRESHOLD_LEVEL.CRITICAL_HIGH)
      expect(result.color).toBe(COLOR.RED)
      expect(result.shouldFlashWidget).toBe(true)
    })

    it('detects critical low', () => {
      const result = evaluateThresholdState(5, thresholds)
      expect(result.state).toBe(THRESHOLD_LEVEL.CRITICAL_LOW)
      expect(result.color).toBe(COLOR.RED)
      expect(result.shouldFlashWidget).toBe(true)
    })

    it('detects alarm', () => {
      const result = evaluateThresholdState(45, thresholds)
      expect(result.state).toBe(THRESHOLD_LEVEL.ALARM)
      expect(result.color).toBe(COLOR.ORANGE)
      expect(result.shouldFlash).toBe(true)
      expect(result.shouldFlashWidget).toBe(false)
    })

    it('detects normal range', () => {
      const result = evaluateThresholdState(35, thresholds)
      expect(result.state).toBe(THRESHOLD_LEVEL.NORMAL)
      expect(result.color).toBe(COLOR.GREEN)
      expect(result.shouldFlash).toBe(false)
    })

    it('detects alert range', () => {
      const result = evaluateThresholdState(25, thresholds)
      expect(result.state).toBe(THRESHOLD_LEVEL.ALERT)
      expect(result.color).toBe(COLOR.GOLD)
    })

    it('does not flash when container is stopped', () => {
      const result = evaluateThresholdState(55, thresholds, true, false)
      expect(result.shouldFlash).toBe(false)
      expect(result.shouldFlashWidget).toBe(false)
    })

    it('does not flash when container is offline', () => {
      const result = evaluateThresholdState(55, thresholds, false, true)
      expect(result.shouldFlash).toBe(false)
      expect(result.shouldFlashWidget).toBe(false)
    })
  })

  describe('getDynamicThresholds', () => {
    const defaults = { temp: 50 }

    it('returns defaults when no container type', () => {
      const result = getDynamicThresholds('', [], defaults)
      expect(result).toEqual(defaults)
    })

    it('returns defaults when settings not array', () => {
      const result = getDynamicThresholds('bd', null as any, defaults)
      expect(result).toEqual(defaults)
    })

    it('returns defaults when no matching container', () => {
      const settings = [{ model: 'container-mbt-1', thresholds: { temp: 60 } }]
      const result = getDynamicThresholds('bd', settings, defaults)
      expect(result).toEqual(defaults)
    })

    it('returns defaults when thresholds empty', () => {
      const settings = [{ model: 'container-bd-1', thresholds: {} }]
      const result = getDynamicThresholds('bd', settings, defaults)
      expect(result).toEqual(defaults)
    })
  })

  describe('transformThresholdsForUtility', () => {
    it('returns null for invalid container type', () => {
      const result = transformThresholdsForUtility('invalid' as any, {})
      expect(result).toBeNull()
    })

    it('returns null when no thresholds', () => {
      const result = transformThresholdsForUtility('bitdeer', null as any)
      expect(result).toBeNull()
    })

    it('transforms bitdeer oil temperature thresholds', () => {
      const apiThresholds = {
        oilTemperature: {
          criticalLow: 33,
          alert: 39,
          normal: 42,
          alarm: 45,
        },
      }
      const result = transformThresholdsForUtility('bitdeer', apiThresholds)
      expect(result).toEqual({
        oilTemperature: {
          COLD: 33,
          LIGHT_WARM: 39,
          WARM: 42,
          HOT: 45,
        },
      })
    })

    it('skips undefined values', () => {
      const apiThresholds = {
        oilTemperature: {
          criticalLow: 33,
          alert: undefined,
        },
      }
      const result = transformThresholdsForUtility('bitdeer', apiThresholds)
      expect(result).toEqual({
        oilTemperature: {
          COLD: 33,
        },
      })
    })
  })

  describe('getColorFromThresholds', () => {
    const thresholds = {
      criticalLow: 10,
      normal: 30,
      alarm: 40,
      criticalHigh: 50,
    }

    it('returns empty for null value', () => {
      const color = getColorFromThresholds(null, thresholds)
      expect(color).toBe('')
    })

    it('returns white when disabled', () => {
      const color = getColorFromThresholds(35, thresholds, true)
      expect(color).toBe(COLOR.WHITE)
    })

    it('returns white when stopped', () => {
      const color = getColorFromThresholds(35, thresholds, false, CONTAINER_STATUS.STOPPED)
      expect(color).toBe(COLOR.WHITE)
    })

    it('returns green for normal', () => {
      const color = getColorFromThresholds(35, thresholds)
      expect(color).toBe(COLOR.GREEN)
    })

    it('returns red for critical high', () => {
      const color = getColorFromThresholds(55, thresholds)
      expect(color).toBe(COLOR.RED)
    })
  })

  describe('getColorAndTooltipFromThresholds', () => {
    const thresholds = { criticalLow: 10, normal: 30 }

    it('returns tooltip for disabled state', () => {
      const result = getColorAndTooltipFromThresholds(35, thresholds, true)
      expect(result.color).toBe(COLOR.WHITE)
      expect(result.tooltip).toContain('disabled')
    })

    it('returns tooltip for stopped state', () => {
      const result = getColorAndTooltipFromThresholds(
        35,
        thresholds,
        false,
        CONTAINER_STATUS.STOPPED,
      )
      expect(result.color).toBe(COLOR.WHITE)
      expect(result.tooltip).toContain('stopped')
    })

    it('returns empty tooltip for normal state', () => {
      const result = getColorAndTooltipFromThresholds(35, thresholds)
      expect(result.tooltip).toBe('')
    })
  })

  describe('getShouldFlashFromThresholds', () => {
    const thresholds = {
      criticalLow: 10,
      normal: 30,
      alarm: 40,
      criticalHigh: 50,
    }

    it('returns false for null value', () => {
      expect(getShouldFlashFromThresholds(null, thresholds)).toBe(false)
    })

    it('returns true for critical high', () => {
      expect(getShouldFlashFromThresholds(55, thresholds)).toBe(true)
    })

    it('returns true for alarm', () => {
      expect(getShouldFlashFromThresholds(45, thresholds)).toBe(true)
    })

    it('returns false for normal', () => {
      expect(getShouldFlashFromThresholds(35, thresholds)).toBe(false)
    })

    it('returns false when stopped', () => {
      expect(getShouldFlashFromThresholds(55, thresholds, CONTAINER_STATUS.STOPPED)).toBe(false)
    })
  })

  describe('getShouldFlashWidgetFromThresholds', () => {
    const thresholds = {
      criticalLow: 10,
      normal: 30,
      alarm: 40,
      criticalHigh: 50,
    }

    it('returns false for null value', () => {
      expect(getShouldFlashWidgetFromThresholds(null, thresholds)).toBe(false)
    })

    it('returns true for critical high', () => {
      expect(getShouldFlashWidgetFromThresholds(55, thresholds)).toBe(true)
    })

    it('returns false for alarm (not critical)', () => {
      expect(getShouldFlashWidgetFromThresholds(45, thresholds)).toBe(false)
    })

    it('returns true for critical low', () => {
      expect(getShouldFlashWidgetFromThresholds(5, thresholds)).toBe(true)
    })

    it('returns false when offline', () => {
      expect(getShouldFlashWidgetFromThresholds(55, thresholds, CONTAINER_STATUS.OFFLINE)).toBe(
        false,
      )
    })
  })

  describe('tHRESHOLD_KEY_MAPPINGS', () => {
    it('has bitdeer mappings', () => {
      expect(THRESHOLD_KEY_MAPPINGS.bitdeer.oilTemperature.COLD).toBe('criticalLow')
      expect(THRESHOLD_KEY_MAPPINGS.bitdeer.tankPressure.CRITICAL_HIGH).toBe('criticalHigh')
    })

    it('has microbt mappings', () => {
      expect(THRESHOLD_KEY_MAPPINGS.microbt.waterTemperature.COLD).toBe('criticalLow')
    })

    it('has hydro mappings', () => {
      expect(THRESHOLD_KEY_MAPPINGS.hydro.waterTemperature.SUPERHOT).toBe('criticalHigh')
    })

    it('has immersion mappings', () => {
      expect(THRESHOLD_KEY_MAPPINGS.immersion.oilTemperature.WARM).toBe('normal')
    })
  })

  describe('findMatchingContainer', () => {
    const settings: ContainerSetting[] = [
      { model: 'bd', thresholds: { temp: 40 } },
      { model: 'mbt', thresholds: { temp: 50 } },
      { model: 'container-bd-d40-m30', thresholds: { temp: 45 } },
    ]

    it('returns null for empty settings', () => {
      expect(findMatchingContainer([], 'bd')).toBeNull()
    })

    it('returns null for invalid input', () => {
      expect(findMatchingContainer(null as any, 'bd')).toBeNull()
      expect(findMatchingContainer(settings, '')).toBeNull()
    })

    it('finds exact match', () => {
      const result = findMatchingContainer(settings, 'bd')
      expect(result).toEqual({ model: 'bd', thresholds: { temp: 40 } })
    })

    it('prioritizes exact match over model match', () => {
      const result = findMatchingContainer(settings, 'container-bd-d40-m30')
      expect(result).toEqual({ model: 'container-bd-d40-m30', thresholds: { temp: 45 } })
    })

    it('falls back to settings model', () => {
      const settingsWithoutExact = [{ model: 'bd', thresholds: { temp: 40 } }]
      const result = findMatchingContainer(settingsWithoutExact, 'container-bd-d40-m30')
      expect(result).toEqual({ model: 'bd', thresholds: { temp: 40 } })
    })

    it('returns null when no match found', () => {
      const result = findMatchingContainer(settings, 'hydro')
      expect(result).toBeNull()
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

    it('returns immersion defaults', () => {
      const result = getDefaultThresholdStructure('container-as-immersion')

      expect(result.oilTemperature).toBeDefined()
    })

    it('returns empty for unknown type', () => {
      const result = getDefaultThresholdStructure('unknown')
      expect(result).toEqual({})
    })
  })
})
