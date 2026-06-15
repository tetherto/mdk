import { CURRENCY, UNITS } from '@core'
import { describe, expect, it } from 'vitest'

import {
  btcBarLabelFormatter,
  rateLabelFormatter,
  usdBarLabelFormatterWithDecimals,
} from '../build-energy-balance-view-model'
import {
  downtimeRateChartTooltip,
  energyCostChartTooltip,
  energyPerMwTooltip,
} from '../energy-balance-chart.constants'

const sampleValue = 12.3456789

describe('energy-balance-chart.constants', () => {
  describe('energyPerMwTooltip', () => {
    it('formats USD display mode with USD per MWh suffix', () => {
      const text = energyPerMwTooltip(CURRENCY.USD_LABEL).valueFormatter?.(sampleValue)

      expect(text).toBe(
        `${usdBarLabelFormatterWithDecimals(sampleValue)} ${CURRENCY.USD_LABEL}/${UNITS.ENERGY_MWH}`,
      )
    })

    it('formats BTC display mode with BTC per MWh suffix', () => {
      const text = energyPerMwTooltip(CURRENCY.BTC_LABEL).valueFormatter?.(sampleValue)

      expect(text).toBe(
        `${btcBarLabelFormatter(sampleValue)} ${CURRENCY.BTC_LABEL}/${UNITS.ENERGY_MWH}`,
      )
    })
  })

  describe('energyCostChartTooltip', () => {
    const customBarLabel = (value: number): string => `fmt:${value}`

    it('formats USD display mode with USD per MWh suffix', () => {
      const text = energyCostChartTooltip(
        CURRENCY.USD_LABEL,
        null,
        customBarLabel,
      ).valueFormatter?.(sampleValue)

      expect(text).toBe(
        `${usdBarLabelFormatterWithDecimals(sampleValue)} ${CURRENCY.USD_LABEL}/${UNITS.ENERGY_MWH}`,
      )
    })

    it('formats BTC display mode with provided btc unit label', () => {
      const text = energyCostChartTooltip(
        CURRENCY.BTC_LABEL,
        'Sats',
        customBarLabel,
      ).valueFormatter?.(sampleValue)

      expect(text).toBe(`${customBarLabel(sampleValue)} Sats/${UNITS.ENERGY_MWH}`)
    })

    it('falls back to BTC label when btc unit is null', () => {
      const text = energyCostChartTooltip(
        CURRENCY.BTC_LABEL,
        null,
        customBarLabel,
      ).valueFormatter?.(sampleValue)

      expect(text).toBe(`${customBarLabel(sampleValue)} ${CURRENCY.BTC_LABEL}/${UNITS.ENERGY_MWH}`)
    })
  })

  describe('downtimeRateChartTooltip', () => {
    it('uses the shared rate label formatter', () => {
      const text = downtimeRateChartTooltip.valueFormatter?.(0.05123)

      expect(text).toBe(rateLabelFormatter(0.05123))
    })
  })
})
