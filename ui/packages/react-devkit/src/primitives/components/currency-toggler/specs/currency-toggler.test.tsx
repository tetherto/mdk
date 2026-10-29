import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { CurrencyToggler } from '../index'

describe('CurrencyToggler', () => {
  it('names each button as a currency by default, and reports the choice', () => {
    const onChange = vi.fn()
    render(<CurrencyToggler currencies={['USD', 'BTC']} value="USD" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Select BTC currency' }))
    expect(onChange).toHaveBeenCalledWith('BTC')
  })

  it('takes its own accessible names for options that are not currencies', () => {
    render(
      <CurrencyToggler
        currencies={[{ value: 'unit', label: 'Per unit' }]}
        value="unit"
        onChange={() => {}}
        itemAriaLabel={(label) => `Show ${label}`}
      />,
    )
    expect(screen.getByRole('button', { name: 'Show Per unit' })).toBeInTheDocument()
  })

  it('does not report a disabled option', () => {
    const onChange = vi.fn()
    render(
      <CurrencyToggler
        currencies={[{ value: 'BTC', disabled: true }]}
        value="USD"
        onChange={onChange}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Select BTC currency' }))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('stretches to its container when full width', () => {
    const { container } = render(
      <CurrencyToggler currencies={['A']} value="A" onChange={() => {}} fullWidth />,
    )
    expect(container.firstChild).toHaveClass('mdk_currency_toggler--full-width')
  })
})
