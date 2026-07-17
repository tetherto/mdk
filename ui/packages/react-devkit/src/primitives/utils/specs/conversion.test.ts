import { describe, expect, it } from 'vitest'

import {
  calculateCurtailment,
  calculateTransactionSum,
  convertEnergy,
  convertMpaToBar,
  toMW,
  toMWh,
  toPHS,
  unitToKilo,
} from '../conversion'

describe('toMW', () => {
  it('converts watts to megawatts', () => {
    expect(toMW(1_000_000)).toBe(1)
    expect(toMW(500_000)).toBe(0.5)
  })
})

describe('toMWh', () => {
  it('converts watts to MWh assuming 24h', () => {
    expect(toMWh(1_000_000)).toBe(24)
  })
})

describe('toPHS', () => {
  it('converts raw hashrate to PH/s', () => {
    expect(toPHS(1e9)).toBe(1)
    expect(toPHS(5e9)).toBe(5)
  })
})

describe('unitToKilo', () => {
  it('divides by 1000', () => {
    expect(unitToKilo(5000)).toBe(5)
  })
})

describe('convertMpaToBar', () => {
  it('converts MPa to Bar', () => {
    expect(convertMpaToBar(1)).toBe(10)
    expect(convertMpaToBar(2.5)).toBe(25)
  })

  it('returns 0 for non-number input', () => {
    expect(convertMpaToBar('invalid')).toBe(0)
    expect(convertMpaToBar(null)).toBe(0)
    expect(convertMpaToBar(Infinity)).toBe(0)
  })
})

describe('convertEnergy', () => {
  it('applies multiplier to energy value', () => {
    expect(convertEnergy(100)).toBe(100)
    expect(convertEnergy(100, 2)).toBe(200)
    expect(convertEnergy(50, 0.5)).toBe(25)
  })
})

describe('calculateCurtailment', () => {
  it('computes curtailment MWh and rate', () => {
    const result = calculateCurtailment(1_000_000, 30, 1, 24)
    expect(result.curtailmentMWh).toBe(6)
    expect(result.curtailmentRate).toBeGreaterThanOrEqual(0)
  })

  it('clamps curtailment rate to 0 when negative', () => {
    const result = calculateCurtailment(50_000_000, 1, 1, 24)
    expect(result.curtailmentRate).toBe(0)
  })
})

describe('calculateTransactionSum', () => {
  it('sums revenue and fees from changed_balance format', () => {
    const transactions = [
      { changed_balance: 0.1, mining_extra: { tx_fee: 0.001 } },
      { changed_balance: 0.2 },
    ]
    const sum = calculateTransactionSum(transactions)
    expect(sum.revenueBTC).toBeCloseTo(0.3, 10)
    expect(sum.feesBTC).toBe(0.001)
  })

  it('sums revenue and fees from satoshis_net_earned format', () => {
    const transactions = [
      { satoshis_net_earned: 100_000_000, fees_colected_satoshis: 10_000_000 },
      { satoshis_net_earned: 50_000_000 },
    ]
    const sum = calculateTransactionSum(transactions)
    expect(sum.revenueBTC).toBe(1.5)
    expect(sum.feesBTC).toBe(0.1)
  })

  it('returns zeros for empty or null transactions', () => {
    expect(calculateTransactionSum([])).toEqual({ revenueBTC: 0, feesBTC: 0 })
    expect(calculateTransactionSum(null as unknown as never[])).toEqual({
      revenueBTC: 0,
      feesBTC: 0,
    })
  })
})
