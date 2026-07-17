import { describe, expect, it } from 'vitest'

import { buildOperationsEnergySlices } from '../operations-energy-chart-slices'

const baseTotals = {
  totalEnergyCostsUSD: 4_820,
  totalOperationalCostsUSD: 2_400,
  totalCostsUSD: 7_220,
  totalConsumptionMWh: 397,
}

describe('buildOperationsEnergySlices', () => {
  it('returns an empty array when totals is null', () => {
    expect(buildOperationsEnergySlices(null)).toEqual([])
  })

  it('renders both slices when both totals are positive in Operations then Energy order', () => {
    const slices = buildOperationsEnergySlices(baseTotals)

    expect(slices.map((s) => s.label)).toEqual(['Operations', 'Energy'])
    expect(slices.map((s) => s.value)).toEqual([2_400, 4_820])
  })

  it('drops a zero-valued operations slice to avoid 0-width segments', () => {
    const slices = buildOperationsEnergySlices({
      ...baseTotals,
      totalOperationalCostsUSD: 0,
    })

    expect(slices.map((s) => s.label)).toEqual(['Energy'])
  })

  it('drops a zero-valued energy slice to avoid 0-width segments', () => {
    const slices = buildOperationsEnergySlices({
      ...baseTotals,
      totalEnergyCostsUSD: 0,
    })

    expect(slices.map((s) => s.label)).toEqual(['Operations'])
  })

  it('returns an empty array when both totals are zero', () => {
    const slices = buildOperationsEnergySlices({
      ...baseTotals,
      totalEnergyCostsUSD: 0,
      totalOperationalCostsUSD: 0,
    })

    expect(slices).toEqual([])
  })

  it('tags each slice with a distinct color so consumers do not need to add their own palette', () => {
    const slices = buildOperationsEnergySlices(baseTotals)

    expect(slices[0]?.color).toBeTruthy()
    expect(slices[1]?.color).toBeTruthy()
    expect(slices[0]?.color).not.toBe(slices[1]?.color)
  })
})
