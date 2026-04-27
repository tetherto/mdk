import { describe, expect, it, vi } from 'vitest'
import { MinerStatuses } from '../../../../../constants/device-constants'
import { HEATMAP_MODE } from '../../../../../constants/temperature-constants'
import { SOCKET_STATUSES } from '../../../../../utils/status-utils'
import {
  getHeatmapDisplayValue,
  getHeatmapTooltipText,
  getSocketStatus,
  getSocketTooltipText,
} from '../socket-utils'

vi.mock('@mdk/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mdk/core')>()
  return {
    ...actual,
    formatErrors: vi.fn(() => 'formatted_errors'),
    UNITS: { TEMPERATURE_C: '°C' },
  }
})

vi.mock('../../../../../utils/alerts-utils', () => ({
  getAlertsString: vi.fn(() => 'formatted_alerts'),
}))

vi.mock('../../../../../utils/device-utils', () => ({
  getHashrateUnit: vi.fn((val) => ({ value: val / 1000, unit: 'TH/s' })),
}))

describe('Socket Utilities', () => {
  const mockGetFormattedDate = () => '2026-03-30'

  describe('getSocketTooltipText', () => {
    it('returns "Miner not connected" when miner is null', () => {
      expect(getSocketTooltipText(null, true, mockGetFormattedDate)).toContain(
        'Miner not connected',
      )
    })

    it('shows error message when miner has an error snapshot', () => {
      const miner = { err: 'Connection Timeout', last: { err: 'Connection Timeout' } } as any
      expect(getSocketTooltipText(miner, true, mockGetFormattedDate)).toContain(
        'Miner in error: Connection Timeout',
      )
    })

    it('displays mining power mode when status is mining', () => {
      const miner = {
        snap: {
          stats: { status: MinerStatuses.MINING },
          config: { power_mode: 'Normal' },
        },
      } as any
      const result = getSocketTooltipText(miner, true, mockGetFormattedDate)
      expect(result).toContain('Mining in Power mode: Normal')
    })

    it('includes socket and cooling info when container control is supported', () => {
      const miner = { snap: { stats: { status: MinerStatuses.MINING } } } as any
      const result = getSocketTooltipText(miner, true, mockGetFormattedDate, true, true)
      expect(result).toContain('Socket: on, Cooling: on')
    })
  })

  describe('getSocketStatus', () => {
    it('returns MINER_DISCONNECTED when miner is null', () => {
      expect(getSocketStatus(null)).toBe(SOCKET_STATUSES.MINER_DISCONNECTED)
    })

    it('returns ERROR_MINING if all errors are minor', () => {
      const miner = { snap: { stats: { are_all_errors_minor: true } } } as any
      expect(getSocketStatus(miner)).toBe(SOCKET_STATUSES.ERROR_MINING)
    })

    it('returns CONNECTING when status is missing but no error exists', () => {
      const miner = { snap: {} } as any
      expect(getSocketStatus(miner)).toBe(SOCKET_STATUSES.CONNECTING)
    })

    it('returns power_mode if mining normally', () => {
      const miner = {
        snap: {
          stats: { status: MinerStatuses.MINING },
          config: { power_mode: 'High' },
        },
      } as any
      expect(getSocketStatus(miner)).toBe('High')
    })
  })

  describe('getHeatmapDisplayValue', () => {
    it('returns "-" if there is an error or no miner', () => {
      expect(
        getHeatmapDisplayValue({
          error: true,
          miner: null,
          mode: HEATMAP_MODE.HASHRATE,
          hashRate: 100,
          temperature: 50,
        }),
      ).toBe('-')
    })

    it('returns scaled hashrate value in hashrate mode', () => {
      const params = {
        miner: {} as any,
        mode: HEATMAP_MODE.HASHRATE,
        hashRate: 5000,
        temperature: null,
      }
      expect(getHeatmapDisplayValue(params)).toBe(5) // 5000 / 1000 from mock
    })

    it('returns rounded temperature in temperature mode', () => {
      const params = {
        miner: {} as any,
        mode: 'TEMP',
        hashRate: null,
        temperature: 55.6,
      }
      expect(getHeatmapDisplayValue(params)).toBe('56')
    })
  })

  describe('getHeatmapTooltipText', () => {
    it('returns "Miner disconnected" on error', () => {
      const params = { error: true } as any
      expect(getHeatmapTooltipText(params)).toBe('Miner disconnected')
    })

    it('returns "Miner in offline mode" if status is offline in hashrate mode', () => {
      const params = {
        isHeatmapMode: true,
        mode: HEATMAP_MODE.HASHRATE,
        status: SOCKET_STATUSES.OFFLINE,
        hashRateLabel: '',
      } as any
      expect(getHeatmapTooltipText(params)).toBe('Miner in offline mode')
    })

    it('returns temperature with units in temp mode', () => {
      const params = {
        isHeatmapMode: true,
        mode: 'TEMP',
        currentTemperature: 60,
      } as any
      expect(getHeatmapTooltipText(params)).toBe('Temp: 60°C')
    })

    it('falls back to getSocketTooltipText if not in heatmap mode', () => {
      const params = {
        isHeatmapMode: false,
        miner: { snap: { stats: { status: 'testing' } } },
        enabled: true,
        getFormattedDate: mockGetFormattedDate,
      } as any
      expect(getHeatmapTooltipText(params)).toContain('Miner in testing mode')
    })
  })
})
