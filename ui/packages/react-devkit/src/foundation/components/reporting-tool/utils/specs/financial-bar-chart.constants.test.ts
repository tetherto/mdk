import { CURRENCY, formatValueUnit, UNITS } from '@core'
import { describe, expect, it } from 'vitest'

import {
  btcChartTooltip,
  financialBarChartScalesXY,
  usdChartTooltip,
  usdPerMwhChartTooltip,
} from '../financial-bar-chart.constants'

const sampleValue = 1234.56

describe('financial-bar-chart.constants', () => {
  describe('financialBarChartScalesXY', () => {
    it('enables both axes with expected layout flags', () => {
      expect(financialBarChartScalesXY.x.display).toBe(true)
      expect(financialBarChartScalesXY.x.beginAtZero).toBe(true)
      expect(financialBarChartScalesXY.y.display).toBe(true)
      expect(financialBarChartScalesXY.y.grid?.display).toBe(true)
    })
  })

  describe('usdChartTooltip', () => {
    it('formats values with USD via formatValueUnit', () => {
      const text = usdChartTooltip.valueFormatter?.(sampleValue)

      expect(text).toBe(String(formatValueUnit(sampleValue, CURRENCY.USD)))
    })
  })

  describe('btcChartTooltip', () => {
    it('formats values with BTC via formatValueUnit', () => {
      const text = btcChartTooltip.valueFormatter?.(sampleValue)

      expect(text).toBe(String(formatValueUnit(sampleValue, CURRENCY.BTC)))
    })
  })

  describe('usdPerMwhChartTooltip', () => {
    it('appends slash-separated MWh unit suffix', () => {
      const text = usdPerMwhChartTooltip.valueFormatter?.(sampleValue)

      expect(text).toBe(`${String(formatValueUnit(sampleValue, CURRENCY.USD))}/${UNITS.ENERGY_MWH}`)
      expect(text).toMatch(/\/MWh$/)
    })

    it('locks USD/MWh template for a round dollar value', () => {
      expect(usdPerMwhChartTooltip.valueFormatter?.(100)).toBe('$100/MWh')
    })
  })
})
