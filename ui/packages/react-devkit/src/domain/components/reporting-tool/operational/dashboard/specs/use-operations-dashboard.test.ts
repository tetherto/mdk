import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  HASHRATE_LABELS,
  MINERS_STACK_GROUP,
  MINERS_STATUS_CONFIG,
  NOMINAL_LINE_COLOR,
  TREND_SERIES_COLOR,
} from '../dashboard.constants'
import type { UseOperationsDashboardInput } from '../dashboard.types'
import { useOperationsDashboard } from '../use-operations-dashboard'

const TS_A = 1_769_025_600_000
const TS_B = TS_A + 24 * 60 * 60 * 1000

const shape = (input: UseOperationsDashboardInput) =>
  renderHook(() => useOperationsDashboard(input)).result.current

describe('useOperationsDashboard', () => {
  describe('hashrate payload', () => {
    it('converts MH/s to TH/s and labels the series', () => {
      const { hashrate } = shape({
        hashrate: { log: [{ ts: TS_A, value: 95_000_000 }] },
      })

      const [series] = hashrate.data.datasets
      expect(series.label).toBe(HASHRATE_LABELS.series)
      expect(series.borderColor).toBe(TREND_SERIES_COLOR)
      expect(series.data).toEqual([{ x: TS_A, y: 95 }])
      expect(hashrate.data.yTicksFormatter?.(95)).toBe('95.00')
    })

    it('adds a flat nominal reference line when nominalValue is set', () => {
      const { hashrate } = shape({
        hashrate: { log: [{ ts: TS_A, value: 95_000_000 }], nominalValue: 110_000_000 },
      })

      expect(hashrate.data.datasets).toHaveLength(2)
      const [, nominal] = hashrate.data.datasets
      expect(nominal.label).toBe(HASHRATE_LABELS.nominal)
      expect(nominal.borderColor).toBe(NOMINAL_LINE_COLOR)
      expect(nominal.data).toEqual([{ x: TS_A, y: 110 }])
    })

    it('omits the nominal dataset when no nominal value is provided', () => {
      const { hashrate } = shape({ hashrate: { log: [{ ts: TS_A, value: 95_000_000 }] } })
      expect(hashrate.data.datasets).toHaveLength(1)
    })
  })

  describe('consumption payload', () => {
    it('converts watts to MW', () => {
      const { consumption } = shape({
        consumption: { log: [{ ts: TS_A, value: 38_000_000 }], nominalValue: 45_000_000 },
      })
      expect(consumption.data.datasets[0].data).toEqual([{ x: TS_A, y: 38 }])
      expect(consumption.data.datasets[1].data).toEqual([{ x: TS_A, y: 45 }])
    })
  })

  describe('efficiency payload', () => {
    it('passes efficiency through unchanged (W/TH/s)', () => {
      const { efficiency } = shape({
        efficiency: { log: [{ ts: TS_A, value: 21 }], nominalValue: 19 },
      })
      expect(efficiency.data.datasets[0].data).toEqual([{ x: TS_A, y: 21 }])
      expect(efficiency.data.datasets[1].data).toEqual([{ x: TS_A, y: 19 }])
    })
  })

  describe('miners payload', () => {
    it('builds one stacked dataset per status with MM-DD labels', () => {
      const { miners } = shape({
        miners: {
          log: [
            { ts: TS_A, online: 1200, error: 10, offline: 8, sleep: 20, maintenance: 4 },
            { ts: TS_B, online: 1190, error: 12, offline: 8, sleep: 21, maintenance: 5 },
          ],
        },
      })

      expect(miners.data.labels).toHaveLength(2)
      expect(miners.data.datasets).toHaveLength(MINERS_STATUS_CONFIG.length)

      const online = miners.data.datasets[0]
      expect(online.label).toBe('Online')
      expect(online.stack).toBe(MINERS_STACK_GROUP)
      expect(online.data).toEqual([1200, 1190])
    })

    it('drops buckets with invalid timestamps', () => {
      const { miners } = shape({
        miners: {
          log: [
            { ts: Number.NaN, online: 1, error: 0, offline: 0, sleep: 0, maintenance: 0 },
            { ts: TS_A, online: 5, error: 0, offline: 0, sleep: 0, maintenance: 0 },
          ],
        },
      })
      expect(miners.data.labels).toHaveLength(1)
      expect(miners.data.datasets[0].data).toEqual([5])
    })
  })

  describe('empty + state propagation', () => {
    it('returns empty payloads when called with no input', () => {
      const vm = shape({})
      expect(vm.hashrate.data.datasets).toEqual([])
      expect(vm.consumption.data.datasets).toEqual([])
      expect(vm.efficiency.data.datasets).toEqual([])
      expect(vm.miners.data).toEqual({ labels: [], datasets: [] })
    })

    it('propagates loading and error flags per chart', () => {
      const err = new Error('boom')
      const vm = shape({
        hashrate: { isLoading: true },
        miners: { error: err },
      })
      expect(vm.hashrate.isLoading).toBe(true)
      expect(vm.miners.error).toBe(err)
      expect(vm.consumption.isLoading).toBe(false)
      expect(vm.consumption.error).toBeNull()
    })
  })
})
