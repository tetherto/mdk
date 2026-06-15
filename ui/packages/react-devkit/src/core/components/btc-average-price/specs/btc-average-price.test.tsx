import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { FALLBACK } from '../../../utils/format'
import { BTC_AVERAGE_PRICE } from '../constants'
import { BtcAveragePrice } from '../index'

describe('btcAveragePrice', () => {
  it('renders the default label and formatted price', () => {
    render(<BtcAveragePrice price={97_500} />)

    expect(
      screen.getByText(`${BTC_AVERAGE_PRICE.LABEL}${BTC_AVERAGE_PRICE.SUFFIX}`),
    ).toBeInTheDocument()
    expect(screen.getByText('$97,500')).toBeInTheDocument()
  })

  it('formats large values and zero with grouping and no decimals', () => {
    const { rerender } = render(<BtcAveragePrice price={1_234_567} />)
    expect(screen.getByText('$1,234,567')).toBeInTheDocument()

    rerender(<BtcAveragePrice price={0} />)
    expect(screen.getByText('$0')).toBeInTheDocument()
  })

  it('supports a custom label', () => {
    render(<BtcAveragePrice price={50_000} label="YTD AVG" />)

    expect(screen.getByText('YTD AVG:')).toBeInTheDocument()
    expect(
      screen.queryByText(`${BTC_AVERAGE_PRICE.LABEL}${BTC_AVERAGE_PRICE.SUFFIX}`),
    ).not.toBeInTheDocument()
  })

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['NaN', Number.NaN],
    ['negative', -1],
    ['Infinity', Number.POSITIVE_INFINITY],
  ] as const)('renders value fallback for %s price', (_label, price) => {
    render(<BtcAveragePrice price={price} />)
    expect(screen.getByText(FALLBACK)).toBeInTheDocument()
    expect(
      screen.getByText(`${BTC_AVERAGE_PRICE.LABEL}${BTC_AVERAGE_PRICE.SUFFIX}`),
    ).toBeInTheDocument()
  })

  it('renders value fallback when price is omitted', () => {
    render(<BtcAveragePrice />)
    expect(screen.getByText(FALLBACK)).toBeInTheDocument()
  })

  it('applies BEM structure', () => {
    const { container } = render(<BtcAveragePrice price={50_000} />)

    expect(container.querySelector('.mdk-btc-average-price')).toBeInTheDocument()
    expect(container.querySelector('.mdk-btc-average-price__header')).toBeInTheDocument()
    expect(container.querySelector('.mdk-btc-average-price__value')).toBeInTheDocument()
  })
})
