import { formatValueUnit, UNITS } from '@core'
import { describe, expect, it } from 'vitest'

import { hashrateBarChartTooltip } from '../hashrate-chart.constants'

describe('hashrateBarChartTooltip', () => {
  it('formats values in TH/s', () => {
    const formatted = hashrateBarChartTooltip.valueFormatter?.(12.345, {} as never)
    expect(formatted).toBe(formatValueUnit(12.345, UNITS.HASHRATE_TH_S))
  })
})
