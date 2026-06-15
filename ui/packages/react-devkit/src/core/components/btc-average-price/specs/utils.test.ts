import { describe, expect, it } from 'vitest'

import { FALLBACK } from '../../../utils/format'
import { formatPriceValue } from '../utils'

describe('formatPriceValue', () => {
  it('formats valid prices with a dollar sign and grouping', () => {
    expect(formatPriceValue(97_500)).toBe('$97,500')
    expect(formatPriceValue(1_234_567)).toBe('$1,234,567')
  })

  it('formats zero without decimals', () => {
    expect(formatPriceValue(0)).toBe('$0')
  })

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['NaN', Number.NaN],
    ['negative', -1],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['negative Infinity', Number.NEGATIVE_INFINITY],
  ] as const)('returns FALLBACK for %s', (_label, price) => {
    expect(formatPriceValue(price)).toBe(FALLBACK)
  })
})
