import { describe, expect, it } from 'vitest'

import {
  barLabelFormatter,
  btcBarLabelFormatter,
  rateLabelFormatter,
  usdBarLabelFormatter,
  usdBarLabelFormatterWithDecimals,
} from '../build-energy-balance-view-model'

describe('useEnergyBalance formatters', () => {
  it('barLabelFormatter returns empty string for nil', () => {
    expect(barLabelFormatter(null as unknown as number)).toBe('')
  })

  it('barLabelFormatter returns 0 for zero', () => {
    expect(barLabelFormatter(0)).toBe('0')
  })

  it('usdBarLabelFormatter rounds to whole numbers', () => {
    expect(usdBarLabelFormatter(1234.56)).toBe('1,235')
  })

  it('usdBarLabelFormatterWithDecimals keeps fractional digits', () => {
    expect(usdBarLabelFormatterWithDecimals(12.345)).toBe('12.35')
  })

  it('btcBarLabelFormatter formats small btc values', () => {
    expect(btcBarLabelFormatter(0.001234)).toBe('0.001234')
  })

  it('rateLabelFormatter supports up to 4 decimal places', () => {
    expect(rateLabelFormatter(0.0123)).toBe('0.0123')
  })
})
