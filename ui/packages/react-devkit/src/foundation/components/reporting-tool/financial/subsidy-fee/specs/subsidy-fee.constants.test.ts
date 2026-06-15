import { describe, expect, it } from 'vitest'

import {
  averageFeesTooltip,
  SUBSIDY_FEE_TIMEFRAME_HINT,
  subsidyFeeBarChartScalesXY,
  subsidyFeesTooltip,
} from '../subsidy-fee.constants'

describe('subsidy-fee.constants', () => {
  it('exposes the timeframe hint copy', () => {
    expect(SUBSIDY_FEE_TIMEFRAME_HINT).toContain('timeframe')
  })

  describe('subsidyFeesTooltip', () => {
    it('formats y1 axis values as percent', () => {
      const text = subsidyFeesTooltip.valueFormatter?.(0.12, {
        dataset: { yAxisID: 'y1' },
      } as never)

      expect(text).toBe('0.12%')
    })

    it('formats primary axis values with BTC label', () => {
      const text = subsidyFeesTooltip.valueFormatter?.(1.5, {
        dataset: {},
      } as never)

      expect(text).toContain('1.50')
      expect(text).toMatch(/BTC/)
    })
  })

  describe('averageFeesTooltip', () => {
    it('formats values with sats per vbyte unit', () => {
      const text = averageFeesTooltip.valueFormatter?.(0.42, {} as never)

      expect(text).toContain('0.42')
      expect(text).toMatch(/Sats/)
      expect(text).toMatch(/vByte/)
    })
  })

  describe('subsidyFeeBarChartScalesXY', () => {
    it('enables both axes with expected layout flags', () => {
      expect(subsidyFeeBarChartScalesXY.x.display).toBe(true)
      expect(subsidyFeeBarChartScalesXY.x.beginAtZero).toBe(true)
      expect(subsidyFeeBarChartScalesXY.y.display).toBe(true)
      expect(subsidyFeeBarChartScalesXY.y.grid?.display).toBe(true)
    })
  })
})
