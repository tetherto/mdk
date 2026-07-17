import { CURRENCY, formatValueUnit, UNITS } from '@primitives'
import { describe, expect, it } from 'vitest'

import {
  btcChartTooltip,
  usdChartTooltip,
  usdPerMwhChartTooltip,
} from '../financial-bar-chart.constants'

const sampleValue = 1234.56

describe('financial-bar-chart.constants', () => {
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
