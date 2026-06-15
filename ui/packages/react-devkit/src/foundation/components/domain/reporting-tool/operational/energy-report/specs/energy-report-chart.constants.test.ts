import { describe, expect, it } from 'vitest'

import { UNITS } from '@core'

import {
  formatEnergyReportPowerDataLabel,
  formatEnergyReportPowerMw,
  powerWattsToChartMegawatts,
} from '../energy-report-chart.constants'

describe('energy-report-chart.constants', () => {
  it('converts watts to megawatts for chart data', () => {
    expect(powerWattsToChartMegawatts(45_000_000)).toBe(45)
  })

  it('formats axis and tooltip labels in MW', () => {
    expect(formatEnergyReportPowerMw(45)).toBe(`45.00 ${UNITS.ENERGY_MW}`)
    expect(formatEnergyReportPowerDataLabel(45.123)).toBe('45.12')
  })
})
