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

  it('keeps an option with a disabledReason focusable, shows the reason and ignores clicks', async () => {
    const onChange = vi.fn()
    render(
      <CurrencyToggler
        value="USD"
        onChange={onChange}
        currencies={['USD', { value: 'BTC', disabled: true, disabledReason: 'No BTC prices yet' }]}
      />,
    )
    const btc = screen.getByRole('button', { name: 'Select BTC currency' })

    expect(btc).not.toBeDisabled()
    expect(btc).toHaveAttribute('aria-disabled', 'true')

    fireEvent.focus(btc)
    expect((await screen.findAllByText('No BTC prices yet')).length).toBeGreaterThan(0)

    fireEvent.click(btc)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('ignores disabledReason on an enabled option', () => {
    render(
      <CurrencyToggler
        value="USD"
        onChange={vi.fn()}
        currencies={[{ value: 'USD', disabledReason: 'unused' }]}
      />,
    )

    expect(screen.getByRole('button', { name: 'Select USD currency' })).not.toHaveAttribute(
      'aria-disabled',
    )
  })

  it('stretches to its container when full width', () => {
    const { container } = render(
      <CurrencyToggler currencies={['A']} value="A" onChange={() => {}} fullWidth />,
    )
    expect(container.firstChild).toHaveClass('mdk_currency_toggler--full-width')
  })
})
