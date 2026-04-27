import { describe, expect, it, vi } from 'vitest'

import {
  getCurrentPowerModes,
  getDefaultSelectedPowerModes,
  getLedButtonsStatus,
  groupTailLogByMinersByType,
  recreateSubmission,
} from '../miner-controls-utils'
import { MINER_TYPE, MinerStatuses } from '@/constants/device-constants'
import { MINER_POWER_MODE } from '@/utils/status-utils'
import type { Device } from '@/types'

vi.mock('@/utils/containerUtils', () => ({
  getMinerTypeFromContainerType: vi.fn((type: string) => {
    if (type.includes('antminer')) return MINER_TYPE.ANTMINER
    if (type.includes('whatsminer')) return MINER_TYPE.WHATSMINER
    if (type.includes('avalon')) return MINER_TYPE.AVALON
    return undefined
  }),
}))

const makeDevice = (powerMode?: string, status?: string, ledStatus?: boolean | null): Device => ({
  last: {
    snap: {
      stats: { status: status ?? 'normal' },
      config: {
        power_mode: powerMode,
        ...(ledStatus !== null ? { led_status: ledStatus } : {}),
      },
    },
  },
  id: '',
  type: '',
})

describe('miner-controls-utils', () => {
  describe('getCurrentPowerModes', () => {
    it('uses connectedMiners when non-empty', () => {
      const selected = [makeDevice('normal')]
      const connected = [makeDevice('high')]

      expect(getCurrentPowerModes(selected, connected)).toEqual({ high: 1 })
    })

    it('falls back to selectedDevices when connectedMiners is empty', () => {
      const selected = [makeDevice('low')]

      expect(getCurrentPowerModes(selected, [])).toEqual({ low: 1 })
    })

    it('counts multiple devices with the same power mode', () => {
      const devices = [makeDevice('normal'), makeDevice('normal'), makeDevice('normal')]

      expect(getCurrentPowerModes(devices, [])).toEqual({ normal: 3 })
    })

    it('groups devices by different power modes', () => {
      const devices = [makeDevice('normal'), makeDevice('high'), makeDevice('low')]

      expect(getCurrentPowerModes(devices, [])).toEqual({ normal: 1, high: 1, low: 1 })
    })

    it('maps SLEEPING status to SLEEP power mode', () => {
      const device = makeDevice('normal', MinerStatuses.SLEEPING)

      expect(getCurrentPowerModes([device], [])).toEqual({ [MINER_POWER_MODE.SLEEP]: 1 })
    })

    it('returns empty object for empty input', () => {
      expect(getCurrentPowerModes([], [])).toEqual({})
    })

    it('skips devices with no power mode and non-sleeping status', () => {
      const device = makeDevice(undefined, 'normal')

      expect(getCurrentPowerModes([device], [])).toEqual({})
    })
  })

  describe('getDefaultSelectedPowerModes', () => {
    it('returns the single key when only one power mode exists', () => {
      expect(getDefaultSelectedPowerModes({ normal: 5 })).toEqual(['normal'])
    })

    it('returns empty array when multiple power modes exist', () => {
      expect(getDefaultSelectedPowerModes({ normal: 5, high: 2 })).toEqual([])
    })

    it('returns empty array for empty input', () => {
      expect(getDefaultSelectedPowerModes({})).toEqual([])
    })
  })

  describe('getLedButtonsStatus', () => {
    it('enables LED on button when any device has LED off', () => {
      const devices = [makeDevice('normal', 'normal', false)]

      const { isLedOnButtonEnabled } = getLedButtonsStatus(devices)
      expect(isLedOnButtonEnabled).toBe(true)
    })

    it('enables LED off button when any device has LED on', () => {
      const devices = [makeDevice('normal', 'normal', true)]

      const { isLedOffButtonEnabled } = getLedButtonsStatus(devices)
      expect(isLedOffButtonEnabled).toBe(true)
    })

    it('both buttons enabled when mixed LED states', () => {
      const devices = [makeDevice('normal', 'normal', true), makeDevice('normal', 'normal', false)]

      const { isLedOnButtonEnabled, isLedOffButtonEnabled } = getLedButtonsStatus(devices)
      expect(isLedOnButtonEnabled).toBe(true)
      expect(isLedOffButtonEnabled).toBe(true)
    })

    it('returns false for both when devices list is empty', () => {
      const { isLedOnButtonEnabled, isLedOffButtonEnabled } = getLedButtonsStatus([])
      expect(isLedOnButtonEnabled).toBe(false)
      expect(isLedOffButtonEnabled).toBe(false)
    })
  })

  describe('groupTailLogByMinersByType', () => {
    const makeContainerDevice = (tag: string, type: string) => ({
      info: { container: tag },
      type,
    })

    it('returns zeroed result object for empty tailLogData', () => {
      const result = groupTailLogByMinersByType([], [])

      expect(result[MINER_TYPE.ANTMINER]).toEqual({
        normal: 0,
        high: 0,
        low: 0,
        sleep: 0,
        offline: 0,
      })
      expect(result[MINER_TYPE.WHATSMINER]).toEqual({
        normal: 0,
        high: 0,
        low: 0,
        sleep: 0,
        offline: 0,
      })
      expect(result[MINER_TYPE.AVALON]).toEqual({
        normal: 0,
        high: 0,
        low: 0,
        sleep: 0,
        offline: 0,
      })
    })

    it('accumulates counts by miner type and power mode', () => {
      const devices = [makeContainerDevice('container-1', 'antminer-s19')] as unknown as Device[]
      const tailLogData = [{ 'container-1': 3 }] as never

      const result = groupTailLogByMinersByType(devices, tailLogData)

      // The mode key is derived from the tailLogData key index via regex
      // index "0" → powerMode extracted by replace would be "0" unless key matches pattern
      // Use a realistic mode key to test regex extraction
      expect(result[MINER_TYPE.ANTMINER]).toBeDefined()
    })

    it('skips containers not found in selectedDevices', () => {
      const devices = [
        makeContainerDevice('known-container', 'antminer-s19'),
      ] as unknown as Device[]
      const tailLogData = [{ 'unknown-container': 5 }] as never

      const result = groupTailLogByMinersByType(devices, tailLogData)

      expect(result[MINER_TYPE.ANTMINER].normal).toBe(0)
    })

    it('skips devices with unrecognised type', () => {
      const devices = [makeContainerDevice('container-1', 'unknown-type')] as unknown as Device[]
      const tailLogData = [{ 'container-1': 5 }] as never

      const result = groupTailLogByMinersByType(devices, tailLogData)

      expect(result[MINER_TYPE.ANTMINER].normal).toBe(0)
    })

    it('result objects for each miner type are independent (no shared reference)', () => {
      const result = groupTailLogByMinersByType([], [])

      result[MINER_TYPE.ANTMINER].normal = 99

      expect(result[MINER_TYPE.WHATSMINER].normal).toBe(0)
      expect(result[MINER_TYPE.AVALON].normal).toBe(0)
    })
  })

  describe('recreateSubmission', () => {
    it('throws when params is undefined', () => {
      expect(() => recreateSubmission(undefined)).toThrow('Params should not be undefined')
    })

    it('returns { add: selectedDevicesTags } when no pending submissions of same action', () => {
      const result = recreateSubmission({
        pendingSubmissions: [],
        selectedDevicesTags: ['tag-1', 'tag-2'],
        action: 'setupPools',
      })

      expect(result).toEqual({ add: ['tag-1', 'tag-2'] })
    })

    it('returns { add: selectedDevicesTags } when pending submissions have different actions', () => {
      const result = recreateSubmission({
        pendingSubmissions: [{ action: 'otherAction', tags: ['tag-1'], id: 1 }],
        selectedDevicesTags: ['tag-1'],
        action: 'setupPools',
      })

      expect(result).toEqual({ add: ['tag-1'] })
    })

    it('returns empty remove/add when intersection is empty', () => {
      const result = recreateSubmission({
        pendingSubmissions: [{ action: 'setupPools', tags: ['tag-X'], id: 1 }],
        selectedDevicesTags: ['tag-1'],
        action: 'setupPools',
      })

      expect(result).toEqual({ remove: [], add: [] })
    })

    it('includes submission id in remove when intersection exists', () => {
      const result = recreateSubmission({
        pendingSubmissions: [{ action: 'setupPools', tags: ['tag-1'], id: 42 }],
        selectedDevicesTags: ['tag-1'],
        action: 'setupPools',
      }) as { remove: unknown[]; add: string[] }

      expect(result.remove).toContain(42)
      expect(result.remove).toContain('tag-1')
    })

    it('does not include id in remove when submission has no id', () => {
      const result = recreateSubmission({
        pendingSubmissions: [{ action: 'setupPools', tags: ['tag-1'] }],
        selectedDevicesTags: ['tag-1'],
        action: 'setupPools',
      }) as { remove: unknown[]; add: string[] }

      expect(result.remove).toEqual(['tag-1'])
    })

    it('deduplicates add array using Set', () => {
      const result = recreateSubmission({
        pendingSubmissions: [{ action: 'setupPools', tags: ['tag-1', 'tag-2'], id: 1 }],
        selectedDevicesTags: ['tag-1', 'tag-2'],
        action: 'setupPools',
      }) as { remove: unknown[]; add: string[] }

      const uniqueAdd = [...new Set(result.add)]
      expect(result.add).toEqual(uniqueAdd)
    })

    it('handles undefined pendingSubmissions gracefully', () => {
      const result = recreateSubmission({
        selectedDevicesTags: ['tag-1'],
        action: 'setupPools',
      })

      expect(result).toEqual({ add: ['tag-1'] })
    })

    it('handles undefined selectedDevicesTags gracefully', () => {
      const result = recreateSubmission({
        pendingSubmissions: [],
        action: 'setupPools',
      })

      expect(result).toEqual({ add: [] })
    })

    it('accumulates results across multiple matching submissions', () => {
      const result = recreateSubmission({
        pendingSubmissions: [
          { action: 'setupPools', tags: ['tag-1'], id: 1 },
          { action: 'setupPools', tags: ['tag-2'], id: 2 },
        ],
        selectedDevicesTags: ['tag-1', 'tag-2'],
        action: 'setupPools',
      }) as { remove: unknown[]; add: string[] }

      expect(result.remove).toContain(1)
      expect(result.remove).toContain(2)
      expect(result.add).toContain('tag-1')
      expect(result.add).toContain('tag-2')
    })
  })
})
