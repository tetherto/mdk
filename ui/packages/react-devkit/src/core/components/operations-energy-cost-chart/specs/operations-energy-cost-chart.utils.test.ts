import { describe, expect, it } from 'vitest'

import { CHART_COLORS } from '../../../constants/colors'
import {
  buildOperationsEnergyCostSlices,
  buildOperationsEnergyCostTooltip,
  hasOperationsEnergyCostData,
} from '../utils'

describe('buildOperationsEnergyCostSlices', () => {
  it('returns chart slices with correct values and colors', () => {
    const operationsCost = 1000
    const energyCost = 500

    expect(
      buildOperationsEnergyCostSlices({
        operationalCostsUSD: operationsCost,
        energyCostsUSD: energyCost,
      }),
    ).toEqual([
      {
        label: 'Operations',
        value: operationsCost,
        color: CHART_COLORS.VIOLET,
      },
      {
        label: 'Energy',
        value: energyCost,
        color: CHART_COLORS.SKY_BLUE,
      },
    ])
  })

  it('returns an empty array when both costs are zero', () => {
    expect(
      buildOperationsEnergyCostSlices({
        operationalCostsUSD: 0,
        energyCostsUSD: 0,
      }),
    ).toEqual([])
  })
})

describe('hasOperationsEnergyCostData', () => {
  it('is false when both costs are zero or missing', () => {
    expect(hasOperationsEnergyCostData(undefined)).toBe(false)
    expect(hasOperationsEnergyCostData({ operationalCostsUSD: 0, energyCostsUSD: 0 })).toBe(false)
  })

  it('is true when either cost is non-zero', () => {
    expect(hasOperationsEnergyCostData({ operationalCostsUSD: 1 })).toBe(true)
    expect(hasOperationsEnergyCostData({ energyCostsUSD: 2 })).toBe(true)
  })
})

describe('buildOperationsEnergyCostTooltip', () => {
  const fmt = (value: number, datasets: number[]) =>
    buildOperationsEnergyCostTooltip('USD/MWh').valueFormatter!(
      value,
      { chart: { data: { datasets: [{ data: datasets }] } } } as never,
    )

  it('renders value, unit and share of total', () => {
    expect(fmt(500, [1000, 500])).toBe('500.00 USD/MWh (33.33%)')
  })

  it('falls back to 0% when the total is zero', () => {
    expect(fmt(0, [0, 0])).toBe('0.00 USD/MWh (0%)')
  })
})
