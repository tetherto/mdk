import { describe, expect, it } from 'vitest'

import { BTC_AVERAGE_PRICE } from '../constants'

describe('btcAveragePrice constants', () => {
  it('exposes label tokens', () => {
    expect(BTC_AVERAGE_PRICE.LABEL).toBe('BTC Average Price')
    expect(BTC_AVERAGE_PRICE.SUFFIX).toBe(':')
  })
})
